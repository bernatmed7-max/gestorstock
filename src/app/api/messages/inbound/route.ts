import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { triggerN8nWorkflow } from '@/lib/n8n/client';
import { N8nJobInput, Channel, MessageDirection, EmailThreadingInfo } from '@/types';
import { logMessageEvent, logConversationEvent, logJobEvent } from '@/lib/audit/audit';

// POST /api/messages/inbound - Entry point for messages from channels
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Validate required fields
        const {
            channel,
            channel_account_id,
            conversation_external_id,
            message_external_id,
            direction,
            text,
            attachments,
            timestamp,
            contact_external_id,
            context,
            // Email threading fields
            email_subject,
            email_thread_id,
            email_message_id,
            email_in_reply_to,
            email_references,
        } = body;

        if (!channel || !channel_account_id || !conversation_external_id || !message_external_id) {
            return NextResponse.json(
                { error: 'Campos obligatorios faltantes' },
                { status: 400 }
            );
        }

        if (!text && (!attachments || attachments.length === 0)) {
            return NextResponse.json(
                { error: 'Debe haber texto o al menos un adjunto' },
                { status: 400 }
            );
        }

        if (text && text.length > 10000) {
            return NextResponse.json(
                { error: 'Texto excede 10,000 caracteres' },
                { status: 400 }
            );
        }

        // Validate attachments
        if (attachments) {
            for (const att of attachments) {
                if (att.size > 20 * 1024 * 1024) {
                    return NextResponse.json(
                        { error: `Adjunto ${att.name} excede 20 MB` },
                        { status: 400 }
                    );
                }
            }
        }

        // Get user's workspace (simplified: get first workspace for now)
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

        const workspaceId = workspaceUser.workspace_id;

        // Check for duplicate message (idempotency)
        const { data: existingMessage } = await supabase
            .from('messages')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('message_external_id', message_external_id)
            .single();

        if (existingMessage) {
            return NextResponse.json(
                { error: 'Mensaje duplicado', message_id: existingMessage.id },
                { status: 409 }
            );
        }

        // Get or create channel
        let { data: channelData } = await supabase
            .from('channels')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('channel', channel)
            .eq('channel_account_id', channel_account_id)
            .single();

        if (!channelData) {
            const { data: newChannel, error: channelError } = await supabase
                .from('channels')
                .insert({
                    workspace_id: workspaceId,
                    channel: channel as Channel,
                    channel_account_id,
                    name: `${channel} - ${channel_account_id}`,
                })
                .select('id')
                .single();

            if (channelError || !newChannel) {
                return NextResponse.json(
                    { error: 'Error al crear canal', details: channelError },
                    { status: 500 }
                );
            }
            channelData = newChannel;
        }

        // Get or create contact
        let contactId: string | null = null;
        if (contact_external_id) {
            let { data: contact } = await supabase
                .from('contacts')
                .select('id')
                .eq('workspace_id', workspaceId)
                .eq('contact_external_id', contact_external_id)
                .single();

            if (!contact) {
                const { data: newContact, error: contactError } = await supabase
                    .from('contacts')
                    .insert({
                        workspace_id: workspaceId,
                        contact_external_id,
                    })
                    .select('id')
                    .single();

                if (!contactError && newContact) {
                    contact = newContact;
                }
            }

            if (contact) {
                contactId = contact.id;
            }
        }

        // Get or create conversation
        let { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('channel', channel)
            .eq('conversation_external_id', conversation_external_id)
            .single();

        if (!conversation) {
            const conversationData: Record<string, unknown> = {
                workspace_id: workspaceId,
                channel_id: channelData.id,
                channel: channel as Channel,
                conversation_external_id,
                contact_id: contactId,
                status: 'open',
            };

            // Add email threading fields if present
            if (channel === 'email') {
                if (email_subject) conversationData.email_subject = email_subject;
                if (email_thread_id) conversationData.email_thread_id = email_thread_id;
            }

            const { data: newConversation, error: convError } = await supabase
                .from('conversations')
                .insert(conversationData)
                .select('id')
                .single();

            if (convError || !newConversation) {
                return NextResponse.json(
                    { error: 'Error al crear conversación', details: convError },
                    { status: 500 }
                );
            }
            conversation = newConversation;

            // Log audit event for new conversation
            await logConversationEvent(
                workspaceId,
                newConversation.id,
                'conversation.created',
                user.id,
                undefined,
                conversationData as Record<string, unknown>,
                request
            );
        }

        // Build message data with email threading
        const messageData: Record<string, unknown> = {
            workspace_id: workspaceId,
            conversation_id: conversation.id,
            message_external_id,
            direction: direction as MessageDirection,
            text: text || null,
            attachments: attachments || null,
            timestamp: timestamp || new Date().toISOString(),
        };

        // Add email threading fields if present
        if (channel === 'email') {
            if (email_message_id) messageData.email_message_id = email_message_id;
            if (email_in_reply_to) messageData.email_in_reply_to = email_in_reply_to;
            if (email_references) messageData.email_references = email_references;
        }

        // Insert message
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert(messageData)
            .select('id')
            .single();

        if (messageError || !message) {
            return NextResponse.json(
                { error: 'Error al guardar mensaje', details: messageError },
                { status: 500 }
            );
        }

        // Log audit event
        await logMessageEvent(workspaceId, message.id, 'message.created', user.id, request);

        // Create job for AI analysis
        const jobId = crypto.randomUUID();
        const jobInput: N8nJobInput = {
            job_id: jobId,
            workspace_id: workspaceId,
            user_id: user.id,
            channel: channel as Channel,
            channel_account_id,
            conversation_external_id,
            message_external_id,
            contact_external_id,
            direction: direction as MessageDirection,
            text: text || '',
            attachments,
            timestamp: timestamp || new Date().toISOString(),
            context: context || { last_messages: [] },
        };

        const { error: jobError } = await supabase
            .from('jobs')
            .insert({
                id: jobId,
                workspace_id: workspaceId,
                message_id: message.id,
                conversation_id: conversation.id,
                status: 'pending',
                input: jobInput,
            });

        if (jobError) {
            console.error('Error creating job:', jobError);
            // Continue anyway - job can be retried
        } else {
            // Log audit event for job creation
            await logJobEvent(workspaceId, jobId, 'job.created', user.id);
        }

        // Trigger n8n workflow
        const callbackUrl = `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/n8n`;
        const n8nResult = await triggerN8nWorkflow(jobInput, callbackUrl);

        if (!n8nResult.success) {
            console.error('n8n trigger failed:', n8nResult.error);
            // Update job status to failed
            await supabase
                .from('jobs')
                .update({
                    status: 'failed',
                    error: { code: 'N8N_TRIGGER_FAILED', message: n8nResult.error },
                })
                .eq('id', jobId);
        } else {
            // Update job status to running
            await supabase
                .from('jobs')
                .update({ status: 'running' })
                .eq('id', jobId);
        }

        return NextResponse.json({
            success: true,
            message_id: message.id,
            conversation_id: conversation.id,
            job_id: jobId,
        });

    } catch (error) {
        console.error('Inbound message error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
