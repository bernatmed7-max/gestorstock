import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/contacts/[id] - Get contact details with conversations
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        // Get user's workspace
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!workspaceUser) {
            return NextResponse.json(
                { error: 'Usuario no pertenece a ningún workspace' },
                { status: 403 }
            );
        }

        // Get contact with conversations
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select(`
                *,
                conversations (
                    id,
                    channel,
                    status,
                    last_message_at,
                    email_subject,
                    created_at
                )
            `)
            .eq('id', id)
            .eq('workspace_id', workspaceUser.workspace_id)
            .single();

        if (contactError || !contact) {
            return NextResponse.json(
                { error: 'Contacto no encontrado' },
                { status: 404 }
            );
        }

        // Get message counts and last message for each conversation
        const conversationsWithDetails = await Promise.all(
            (contact.conversations || []).map(async (conv: { id: string; channel: string; status: string; last_message_at: string | null; email_subject?: string; created_at: string }) => {
                // Get message count
                const { count } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('conversation_id', conv.id);

                // Get last message
                const { data: lastMessage } = await supabase
                    .from('messages')
                    .select('text')
                    .eq('conversation_id', conv.id)
                    .order('timestamp', { ascending: false })
                    .limit(1)
                    .single();

                return {
                    ...conv,
                    message_count: count || 0,
                    last_message_text: lastMessage?.text || null,
                };
            })
        );

        return NextResponse.json({
            ...contact,
            conversations: conversationsWithDetails,
        });

    } catch (error) {
        console.error('Get contact error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// PATCH /api/contacts/[id] - Update contact
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, email, phone, metadata } = body;

        // Get user's workspace and role
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

        if (workspaceUser.role === 'viewer') {
            return NextResponse.json(
                { error: 'No tienes permiso para editar contactos' },
                { status: 403 }
            );
        }

        // Update contact
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (metadata !== undefined) updateData.metadata = metadata;

        const { data: contact, error: updateError } = await supabase
            .from('contacts')
            .update(updateData)
            .eq('id', id)
            .eq('workspace_id', workspaceUser.workspace_id)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json(
                { error: 'Error al actualizar contacto', details: updateError },
                { status: 500 }
            );
        }

        return NextResponse.json(contact);

    } catch (error) {
        console.error('Update contact error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
