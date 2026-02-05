import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto/encryption';
import { Channel } from '@/types';

// POST /api/channels/connect/[channel] - Connect a channel
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ channel: string }> }
) {
    try {
        const { channel } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        // Validate channel type
        const validChannels: Channel[] = ['instagram_dm', 'whatsapp_business', 'email'];
        if (!validChannels.includes(channel as Channel)) {
            return NextResponse.json(
                { error: 'Canal no válido' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { channel_account_id, credentials, name } = body;

        if (!channel_account_id || !credentials) {
            return NextResponse.json(
                { error: 'channel_account_id y credentials requeridos' },
                { status: 400 }
            );
        }

        // Get user's workspace
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id, role')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!workspaceUser) {
            return NextResponse.json(
                { error: 'Usuario no pertenece a ningún workspace' },
                { status: 403 }
            );
        }

        // Only admins can connect channels
        if (workspaceUser.role !== 'admin') {
            return NextResponse.json(
                { error: 'Solo administradores pueden conectar canales' },
                { status: 403 }
            );
        }

        // Encrypt credentials
        const credentialsString = JSON.stringify(credentials);
        const encrypted = encrypt(credentialsString);

        // Upsert channel
        const { data: channelData, error: channelError } = await supabase
            .from('channels')
            .upsert({
                workspace_id: workspaceUser.workspace_id,
                channel: channel as Channel,
                channel_account_id,
                name: name || `${channel} - ${channel_account_id}`,
                credentials_ciphertext: encrypted.ciphertext,
                credentials_iv: encrypted.iv,
                credentials_algorithm: encrypted.algorithm,
                is_active: true,
            }, {
                onConflict: 'workspace_id,channel,channel_account_id',
            })
            .select('id')
            .single();

        if (channelError || !channelData) {
            return NextResponse.json(
                { error: 'Error al conectar canal', details: channelError },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            channel_id: channelData.id,
        });

    } catch (error) {
        console.error('Connect channel error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
