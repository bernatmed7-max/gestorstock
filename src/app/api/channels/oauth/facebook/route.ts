import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto/encryption';
import { instagramService } from '@/lib/services/instagram';
import fs from 'fs';
import path from 'path';

const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0';
const LOG_FILE = path.join(process.cwd(), 'oauth_debug.log');

function logToFile(msg: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
}

export async function POST(req: NextRequest) {
    logToFile('--- OAUTH REQUEST RECEIVED ---');
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            logToFile('Auth Error: No authorized user found.');
            console.log('OAuth Error: No authorized user');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
        logToFile(`User authorized: ${user.id}`);

        const { shortLivedToken } = await req.json();
        logToFile('Short-lived token received: ' + (shortLivedToken ? 'YES' : 'NO'));
        console.log('Short-lived token received:', shortLivedToken ? 'YES' : 'NO');

        if (!shortLivedToken) {
            logToFile('Error: Token not provided in request body.');
            return NextResponse.json({ error: 'Token no proporcionado' }, { status: 400 });
        }

        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        // 1. Exchange for long-lived token
        const exchangeUrl = `${FB_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

        logToFile('Attempting token exchange with Facebook...');
        console.log('Exchanging token with Facebook...');
        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = await exchangeRes.json();
        logToFile(`Exchange status: ${exchangeRes.status}`);
        console.log('Exchange Response Status:', exchangeRes.status);

        if (exchangeData.error) {
            logToFile('Exchange Error: ' + JSON.stringify(exchangeData.error));
            console.error('FB Exchange Error:', exchangeData.error);
            return NextResponse.json({ error: 'Error al intercambiar token con Facebook' }, { status: 400 });
        }

        const longLivedToken = exchangeData.access_token;
        logToFile('Long-lived token obtained.');

        // 2. Get User's Pages
        const pagesUrl = `${FB_GRAPH_URL}/me/accounts?access_token=${longLivedToken}&fields=id,name,access_token,instagram_business_account`;
        logToFile('Fetching user pages...');
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();
        logToFile(`Pages Fetch status: ${pagesRes.status}`);

        console.log('FB Pages Response:', JSON.stringify(pagesData, null, 2));

        if (pagesData.error || !pagesData.data) {
            logToFile('Pages Error: ' + JSON.stringify(pagesData.error || pagesData));
            console.error('FB Pages Error:', pagesData);
            return NextResponse.json({
                error: 'Error al obtener páginas',
                details: pagesData
            }, { status: 400 });
        }
        logToFile(`Found ${pagesData.data.length} pages.`);

        // 3. Find Instagram Business Accounts
        const connectedAccounts = [];
        const debugInfo = [];

        for (const page of pagesData.data) {
            if (page.instagram_business_account) {
                connectedAccounts.push({
                    pageId: page.id,
                    pageName: page.name,
                    pageAccessToken: page.access_token,
                    instagramId: page.instagram_business_account.id
                });
            }
            // Collect debug info for every page
            debugInfo.push({
                pageName: page.name,
                pageId: page.id,
                hasInstagramField: !!page.instagram_business_account,
                instagramData: page.instagram_business_account || 'null'
            });
        }

        if (connectedAccounts.length === 0) {
            logToFile('No connected Instagram accounts found in the fetched pages.');
            logToFile('Debug info: ' + JSON.stringify(debugInfo));

            // CHECK: Did we find ANY pages?
            if (debugInfo.length === 0) {
                return NextResponse.json({
                    error: '⚠️ NO has seleccionado ninguna Página de Facebook en el popup. Debes marcar al menos una.',
                    debug: []
                }, { status: 404 });
            }

            return NextResponse.json({
                error: 'No se encontraron cuentas de Instagram Business vinculadas.',
                debug: debugInfo
            }, { status: 404 });
        }

        // 4. Save the first account found (Simplified for MVP)
        const account = connectedAccounts[0];
        logToFile(`Selected account: ${account.pageName} (IG ID: ${account.instagramId})`);

        // Encrypt credentials
        const credentials = {
            access_token: account.pageAccessToken,
            page_id: account.pageId,
            instagram_account_id: account.instagramId,
            user_access_token: longLivedToken
        };

        const credentialsString = JSON.stringify(credentials);
        const encrypted = encrypt(credentialsString);
        logToFile('Credentials encrypted.');

        // Get workspace
        logToFile('Looking for user workspace...');
        let { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single();

        if (!workspaceUser) {
            logToFile('User has no workspace. Attempting to auto-create [ADMIN]...');
            const supabaseAdmin = createAdminClient();

            const { data: newWorkspace, error: createError } = await supabaseAdmin
                .from('workspaces')
                .insert({ name: 'Mi Workspace' })
                .select()
                .single();

            if (createError || !newWorkspace) {
                logToFile('Error creating workspace (Admin): ' + JSON.stringify(createError));
                throw new Error('Usuario sin workspace y error al crearlo: ' + (createError?.message || 'Error desconocido'));
            }

            // Link user to workspace (Admin level)
            const { error: linkError } = await supabaseAdmin
                .from('workspace_users')
                .insert({
                    workspace_id: newWorkspace.id,
                    user_id: user.id,
                    role: 'admin' // Use 'admin' instead of 'owner' to match DB enum
                });

            if (linkError) {
                logToFile('Note: Workspace link error (trigger?): ' + linkError.message);
            }

            // Use the new workspace
            workspaceUser = { workspace_id: newWorkspace.id };
        }

        logToFile(`Target workspace ID: ${workspaceUser?.workspace_id}`);

        // Upsert channel
        logToFile('Upserting channel to database...');
        const { data, error } = await supabase
            .from('channels')
            .upsert({
                workspace_id: workspaceUser!.workspace_id,
                channel: 'instagram_dm',
                channel_account_id: account.instagramId,
                name: `Instagram - ${account.pageName}`,
                is_active: true,
                credentials_ciphertext: encrypted.ciphertext,
                credentials_iv: encrypted.iv,
                credentials_algorithm: encrypted.algorithm,
                metadata: {
                    page_name: account.pageName,
                    page_id: account.pageId,
                    connected_via: 'oauth'
                },
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'workspace_id,channel,channel_account_id'
            })
            .select()
            .single();

        if (error) {
            logToFile('Database Upsert Error: ' + JSON.stringify(error));
            throw error;
        }
        logToFile('Channel successfully upserted.');

        // Sync initial messages
        try {
            logToFile('Starting initial message sync...');
            await instagramService.syncMessages(
                account.pageAccessToken,
                account.pageId,
                account.instagramId,
                workspaceUser!.workspace_id
            );
            logToFile('Initial message sync completed.');
        } catch (syncError: any) {
            logToFile('CRITICAL SYNC ERROR: ' + syncError.message);
            // We return success true but with a warning in logs
            // The user will see their account is connected, but messages might take time or fail.
        }

        logToFile('OAuth Process Finished Successfully.');
        return NextResponse.json({ success: true, account: account.pageName });

    } catch (error: any) {
        logToFile('FATAL OAUTH ERROR: ' + error.message);
        console.error('OAuth Error:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
