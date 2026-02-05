import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageDirection } from '@/types';

// POST /api/conversations/[id]/send - Send message manually
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } // Fix types for Next.js 15+ if needed, but keeping consistent
) {
    try {
        const { id } = await context.params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { text, attachments, type = 'text', template_params } = body;

        // Validation based on type
        if (type === 'text' && !text) {
            return NextResponse.json({ error: 'Texto requerido' }, { status: 400 });
        }
        if (type === 'template' && !template_params) {
            // return NextResponse.json({ error: 'Datos de plantilla requeridos' }, { status: 400 });
        }

        // Get conversation with last_message_at for 24h check
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('workspace_id, channel_id, channel, conversation_external_id, last_message_at, assigned_to')
            .eq('id', id)
            .single();

        if (convError || !conversation) {
            return NextResponse.json(
                { error: 'Conversación no encontrada' },
                { status: 404 }
            );
        }

        // Verify user has access
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id, role')
            .eq('user_id', user.id)
            .eq('workspace_id', conversation.workspace_id)
            .single();

        if (!workspaceUser || (workspaceUser.role !== 'admin' && workspaceUser.role !== 'agent')) {
            return NextResponse.json(
                { error: 'No autorizado para enviar mensajes' },
                { status: 403 }
            );
        }

        // Auto-assign if unassigned
        if (!conversation.assigned_to) {
            await supabase
                .from('conversations')
                .update({ assigned_to: user.id })
                .eq('id', id);
        }

        // Business Logic: 24h Window for WhatsApp
        if (conversation.channel === 'whatsapp_business' && type !== 'template' && type !== 'internal_note') {
            const lastMsgTime = conversation.last_message_at ? new Date(conversation.last_message_at).getTime() : 0;
            const now = Date.now();
            const hoursDiff = (now - lastMsgTime) / (1000 * 60 * 60);

            if (hoursDiff > 24) {
                return NextResponse.json(
                    { error: 'Fuera de la ventana de 24h. Debe usar una Plantilla.' },
                    { status: 400 }
                );
            }
        }

        // Generate external message ID
        const messageExternalId = `out_${Date.now()}_${crypto.randomUUID()}`;

        // Insert message (Status: pending)
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
                workspace_id: conversation.workspace_id,
                conversation_id: id,
                message_external_id: messageExternalId,
                direction: 'out' as MessageDirection,
                type: type,
                text: text || null,
                attachments: attachments || null,
                status: type === 'internal_note' ? 'read' : 'pending', // Notes are auto-read
                timestamp: new Date().toISOString(),
                metadata: template_params ? { template_params } : null
            })
            .select('id')
            .single();

        if (messageError || !message) {
            return NextResponse.json(
                { error: 'Error al guardar mensaje', details: messageError },
                { status: 500 }
            );
        }

        // Stop here if internal note
        if (type === 'internal_note') {
            return NextResponse.json({
                success: true,
                message_id: message.id,
                status: 'saved'
            });
        }

        // Send to n8n (Outbound Webhook)
        const n8nUrl = process.env.N8N_OUTBOUND_WEBHOOK_URL;
        if (!n8nUrl) {
            console.error('N8N_OUTBOUND_WEBHOOK_URL not set');
            return NextResponse.json(
                { error: 'Configuración de envío no disponible' },
                { status: 503 }
            );
        }

        try {
            const n8nPayload = {
                conversation_id: id,
                message_id: message.id, // Our internal ID
                workspace_id: conversation.workspace_id,
                channel: conversation.channel,
                recipient_id: conversation.conversation_external_id, // Phone number or IG ID
                content: {
                    type,
                    text: text,
                    attachments,
                    template: template_params
                }
            };

            const response = await fetch(n8nUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(n8nPayload)
            });

            if (!response.ok) {
                throw new Error(`n8n responded with ${response.status}`);
            }

            // Update to 'sent' (optimistic, or based on immediate n8n ack)
            await supabase
                .from('messages')
                .update({ status: 'sent' })
                .eq('id', message.id);

            return NextResponse.json({
                success: true,
                message_id: message.id,
                status: 'sent'
            });

        } catch (sendError: any) {
            console.error('Error sending to n8n:', sendError);
            // Update to failed
            await supabase
                .from('messages')
                .update({ status: 'failed' })
                .eq('id', message.id);

            return NextResponse.json(
                { error: 'Error al enviar mensaje: ' + sendError.message },
                { status: 502 }
            );
        }
    } catch (error) {
        console.error('Send message error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
