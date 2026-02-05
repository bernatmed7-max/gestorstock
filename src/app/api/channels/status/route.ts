import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'oauth_debug.log');

function logToFile(msg: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] [STATUS_API] ${msg}\n`);
}

export async function GET(req: NextRequest) {
    try {
        logToFile('Checking connection status...');
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            logToFile('Status check failed: No authorized user.');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 1. Get user's workspace
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single();

        if (!workspaceUser) {
            logToFile(`User ${user.id} has no linked workspace.`);
            return NextResponse.json({ connected: false });
        }
        logToFile(`Workspace found: ${workspaceUser.workspace_id}`);

        const searchParams = req.nextUrl.searchParams;
        const type = searchParams.get('type');

        // 2. Query channels
        let query = supabase
            .from('channels')
            .select('channel, channel_account_id, name, is_active')
            .eq('workspace_id', workspaceUser.workspace_id)
            .eq('is_active', true);

        if (type) {
            query = query.eq('channel', type);
        }

        const { data: channels, error } = await query;

        if (error) {
            logToFile(`Error fetching channels for workspace ${workspaceUser.workspace_id}: ${error.message}`);
            return NextResponse.json({ error: 'Error fetching channels' }, { status: 500 });
        }

        if (!channels || channels.length === 0) {
            logToFile(`No channels found for workspace ${workspaceUser.workspace_id}`);
            return NextResponse.json({ connected: false, channels: [] });
        }

        logToFile(`Found ${channels.length} active channels.`);

        // Return structured data
        // If specific type requested and found single, maintain backward compatibility
        if (type && channels.length === 1) {
            return NextResponse.json({
                connected: true,
                type: channels[0].channel,
                account: channels[0].channel_account_id, // Backward compat
                name: channels[0].name,
                accountId: channels[0].channel_account_id,
                isActive: channels[0].is_active
            });
        }

        return NextResponse.json({
            connected: true,
            channels: channels.map(c => ({
                type: c.channel,
                id: c.channel_account_id,
                name: c.name
            }))
        });

    } catch (error) {
        console.error('Error fetching channel status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
