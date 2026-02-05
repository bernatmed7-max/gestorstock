import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto/encryption';
import { Channel } from '@/types';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { channel, credentials } = body;

        if (!channel || !credentials) {
            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 }
            );
        }

        // 1. Get user's workspace
        let { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!workspaceUser) {
            // Auto-create workspace if not exists (Self-healing) [ADMIN]
            console.log('Usuario sin workspace (Manual), creando uno nuevo con Admin Client...');
            const supabaseAdmin = createAdminClient();

            const { data: newWorkspace, error: createError } = await supabaseAdmin
                .from('workspaces')
                .insert({ name: 'Mi Workspace' })
                .select()
                .single();

            if (createError || !newWorkspace) {
                console.error('Error creando workspace (Manual Admin):', createError);
                return NextResponse.json(
                    { error: 'Usuario sin workspace y error al crearlo: ' + (createError?.message || 'Unknown error') },
                    { status: 500 }
                );
            }

            // Link user to workspace (Admin level)
            const { error: linkError } = await supabaseAdmin
                .from('workspace_users')
                .insert({
                    workspace_id: newWorkspace.id,
                    user_id: user.id,
                    role: 'owner'
                });

            if (linkError) {
                console.log('Nota: Error al vincular usuario manual (posible trigger):', linkError.message);
            }

            // Use the new workspace
            workspaceUser = { workspace_id: newWorkspace.id };
        }

        const workspaceId = workspaceUser.workspace_id;

        // 2. Identify channel_account_id based on channel type
        let channelAccountId = '';
        switch (channel as Channel) {
            case 'instagram_dm':
                channelAccountId = credentials.instagram_account_id || credentials.page_id;
                break;
            case 'whatsapp_business':
                channelAccountId = credentials.phone_number_id;
                break;
            case 'email':
                channelAccountId = credentials.smtp_user || credentials.email;
                break;
            default:
                return NextResponse.json({ error: 'Canal no soportado' }, { status: 400 });
        }

        if (!channelAccountId) {
            return NextResponse.json({ error: 'No se pudo identificar el ID de la cuenta' }, { status: 400 });
        }

        // 3. Encrypt credentials
        // Use JSON.stringify to store the whole credentials object
        const credentialsString = JSON.stringify(credentials);
        let encrypted;
        try {
            encrypted = encrypt(credentialsString);
        } catch (e) {
            console.error('Encryption failed:', e);
            return NextResponse.json({ error: 'Error de cifrado en el servidor' }, { status: 500 });
        }

        // 4. Upsert channel
        const { data, error } = await supabase
            .from('channels')
            .upsert({
                workspace_id: workspaceId,
                channel: channel as Channel,
                channel_account_id: channelAccountId,
                name: `${channel} - ${channelAccountId}`,
                is_active: true,
                credentials_ciphertext: encrypted.ciphertext,
                credentials_iv: encrypted.iv,
                credentials_algorithm: encrypted.algorithm,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'workspace_id,channel,channel_account_id'
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving channel:', error);
            return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
        }

        // 5. Audit log (omitted for brevity, but should be added)

        return NextResponse.json({ success: true, channel_id: data.id });

    } catch (error) {
        console.error('Error in channel connect:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
