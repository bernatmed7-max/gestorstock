import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const n8nUrl = process.env.N8N_WEBHOOK_URL;

        // 1. Initialize Supabase and User
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. data access: Get Workspace
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single();

        if (!workspaceUser) {
            return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
        }

        const workspaceId = workspaceUser.workspace_id;

        // 3. Save to Supabase (style_profiles)
        // We will maintain one default profile per workspace for now or just upsert user's profile
        // Map wizard fields to DB schema
        const profileData = {
            workspace_id: workspaceId,
            user_id: user.id,
            name: body.agentName || 'Agente IA',
            description: body.role || 'Asistente Virtual',
            prompt_template: body.systemPrompt,
            training_samples: {
                // Store original form data to populate wizard if we edit later
                rawData: body,
                tones: body.selectedTones,
                restrictions: body.selectedRestrictions
            },
            is_default: true
        };

        // Check if a profile already exists
        const { data: existingProfile, error: fetchError } = await supabase
            .from('style_profiles')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('is_default', true)
            .single();

        let dbOperation;

        if (existingProfile) {
            console.log('🔄 Updating existing agent profile:', existingProfile.id);
            dbOperation = await supabase
                .from('style_profiles')
                .update(profileData)
                .eq('id', existingProfile.id);
        } else {
            console.log('✨ Creating new agent profile');
            dbOperation = await supabase
                .from('style_profiles')
                .insert(profileData);
        }

        if (dbOperation.error) {
            console.error('❌ Database Error:', dbOperation.error);
            // We should probably fail here or at least warn
            return NextResponse.json({ error: 'Error saving agent profile: ' + dbOperation.error.message }, { status: 500 });
        }

        if (!n8nUrl) {
            console.error('N8N_WEBHOOK_URL not defined');
            // If local save succeeded but N8N disabled, we might still want to return success or warning
            // return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // 4. Forward to N8N
        if (n8nUrl) {
            const targetUrl = n8nUrl;
            console.log('🚀 Attempting to connect to n8n at:', targetUrl);

            const payload = {
                event_type: 'agent_config_update',
                ...body,
                workspace_id: workspaceId, // Include clean workspace ID
                credentials: {
                    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***Present***' : 'MISSING',
                    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
                    SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***Present***' : 'MISSING',
                }
            };

            const actualPayload = {
                event_type: 'agent_config_update',
                ...body,
                workspace_id: workspaceId,
                credentials: {
                    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
                    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
                    SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
                    INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN,
                    FACEBOOK_PAGE_ID: process.env.FACEBOOK_PAGE_ID
                }
            };

            console.log('📦 Sending Payload to N8N:', JSON.stringify({
                ...payload,
                systemPrompt: body.systemPrompt ? body.systemPrompt.substring(0, 50) + '...' : 'MISSING'
            }, null, 2));

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(actualPayload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`N8N error at ${targetUrl}: ${response.status} ${response.statusText} `, errorText);
                // Return 200 with warning if DB save worked but N8N failed? 
                // Or fail hard. Let's fail hard to ensure user knows N8N isn't synced.
                return NextResponse.json({
                    error: `Error de N8N(${response.status}): ${errorText || response.statusText} `
                }, { status: 502 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in create-agent route:', error);
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            return NextResponse.json({ error: 'No se pudo conectar con n8n (Connection Refused).' }, { status: 502 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
