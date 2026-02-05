import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/conversations - List conversations with filters
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const channel = searchParams.get('channel');
        const q = searchParams.get('q');

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

        let query = supabase
            .from('conversations')
            .select(`
                id,
                channel,
                status,
                last_message_at,
                created_at,
                contacts (
                    id,
                    name,
                    email,
                    phone,
                    avatar_url
                ),
                channels (
                    id,
                    name,
                    channel
                )
            `)
            .eq('workspace_id', workspaceUser.workspace_id)
            .order('last_message_at', { ascending: false, nullsFirst: false })
            .limit(100);

        if (status) {
            query = query.eq('status', status);
        }

        if (channel) {
            query = query.eq('channel', channel);
        }

        // TODO: Add full-text search when q is provided
        // For now, just filter by contact name if q is provided
        if (q) {
            // This is a simplified search - can be enhanced with full-text search
            query = query.ilike('conversation_external_id', `%${q}%`);
        }

        const { data: conversations, error } = await query;

        if (error) {
            console.error('Error fetching conversations:', error);
            return NextResponse.json(
                { error: 'Error al obtener conversaciones' },
                { status: 500 }
            );
        }

        return NextResponse.json({ conversations: conversations || [] });

    } catch (error) {
        console.error('Conversations list error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
