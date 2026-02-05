import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/conversations/[id] - Get conversation detail with messages and AI outputs
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

        // Get conversation with related data
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select(`
                *,
                contacts (*),
                channels (*),
                messages (
                    id,
                    message_external_id,
                    direction,
                    text,
                    attachments,
                    timestamp,
                    created_at
                ),
                jobs (
                    id,
                    status,
                    created_at,
                    completed_at,
                    error
                )
            `)
            .eq('id', id)
            .single();

        if (convError || !conversation) {
            return NextResponse.json(
                { error: 'Conversación no encontrada' },
                { status: 404 }
            );
        }

        // Verify user has access to this workspace
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .eq('workspace_id', conversation.workspace_id)
            .single();

        if (!workspaceUser) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 403 }
            );
        }

        // Get AI outputs for messages in this conversation
        const { data: aiOutputs } = await supabase
            .from('ai_outputs')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: false });

        return NextResponse.json({
            ...conversation,
            ai_outputs: aiOutputs || [],
        });

    } catch (error) {
        console.error('Conversation detail error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
