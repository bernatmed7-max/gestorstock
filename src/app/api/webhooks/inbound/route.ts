import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/crypto/hmac';
import { executeAutomationTrigger } from '@/lib/services/automation';
import { InboundMessagePayload, MessageDirection, MessageStatus } from '@/types';

// POST /api/webhooks/inbound - Receive normalized message from n8n
export async function POST(request: NextRequest) {
    try {
        // 1. Verify Signature
        const signature = request.headers.get('x-signature');
        const timestamp = request.headers.get('x-timestamp');
        const rawBody = await request.text();

        if (!verifyWebhookSignature(signature, timestamp, rawBody)) {
            console.error('Invalid webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        const payload: InboundMessagePayload = JSON.parse(rawBody);

        // 2. Validate Payload
        if (!payload.channel || !payload.channel_account_id || !payload.conversation_external_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // 3. Find Workspace via Channel
        // We need to know which workspace this message belongs to based on the channel account (e.g. phone number)
        const { data: channelData, error: channelError } = await supabase
            .from('channels')
            .select('id, workspace_id')
            .eq('channel', payload.channel)
            .eq('channel_account_id', payload.channel_account_id)
            .eq('is_active', true)
            .single();

        if (channelError || !channelData) {
            console.error('Channel not found:', payload.channel, payload.channel_account_id);
            return NextResponse.json(
                { error: 'Channel not configured' },
                { status: 404 }
            );
        }

        const workspaceId = channelData.workspace_id;

        // 4. Find or Create Contact
        let contactId = payload.contact_id;

        if (!contactId) {
            // Try to find by external_id
            const { data: existingContact } = await supabase
                .from('contacts')
                .select('id')
                .eq('workspace_id', workspaceId)
                .eq('contact_external_id', payload.conversation_external_id) // Assuming conversation_id is user phone/id
                .single();

            if (existingContact) {
                contactId = existingContact.id;
            } else {
                // Create new contact
                const { data: newContact, error: createContactError } = await supabase
                    .from('contacts')
                    .insert({
                        workspace_id: workspaceId,
                        contact_external_id: payload.conversation_external_id,
                        name: payload.contact_name || payload.conversation_external_id,
                        phone: payload.contact_phone,
                        email: payload.contact_email,
                        // Initialize channel_identifiers if we were using the JSONB approach, 
                        // but for now relying on contact_external_id as primary key key for this channel
                        metadata: { source: 'inbound_webhook' }
                    })
                    .select('id')
                    .single();

                if (createContactError) {
                    console.error('Error creating contact:', createContactError);
                    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
                }
                contactId = newContact.id;
            }
        }

        // 5. Find or Create Conversation
        let conversationId: string;

        const { data: existingConv } = await supabase
            .from('conversations')
            .select('id, unread_count')
            .eq('workspace_id', workspaceId)
            .eq('channel', payload.channel)
            .eq('conversation_external_id', payload.conversation_external_id)
            .single();

        if (existingConv) {
            conversationId = existingConv.id;
            // Update unread count
            await supabase
                .from('conversations')
                .update({
                    unread_count: (existingConv.unread_count || 0) + 1,
                    last_message_at: payload.timestamp,
                    status: 'open' // Re-open conversation on new message
                })
                .eq('id', conversationId);
        } else {
            // Create new conversation
            const { data: newConv, error: createConvError } = await supabase
                .from('conversations')
                .insert({
                    workspace_id: workspaceId,
                    channel_id: channelData.id,
                    channel: payload.channel,
                    conversation_external_id: payload.conversation_external_id,
                    contact_id: contactId,
                    status: 'open',
                    unread_count: 1,
                    last_message_at: payload.timestamp,
                })
                .select('id')
                .single();

            if (createConvError) {
                console.error('Error creating conversation:', createConvError);
                return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
            }
            conversationId = newConv.id;
        }

        // 6. Insert Message
        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                workspace_id: workspaceId,
                conversation_id: conversationId,
                message_external_id: payload.message_external_id,
                direction: payload.direction,
                type: payload.type,
                text: payload.text,
                attachments: payload.attachments,
                status: 'delivered' as MessageStatus, // Inbound messages are by definition delivered to us
                timestamp: payload.timestamp,
                metadata: payload.metadata
            });

        if (msgError) {
            // Check for duplicate message (idempotency)
            if (msgError.code === '23505') { // Unique violation
                return NextResponse.json({ message: 'Message already processed' });
            }
            console.error('Error inserting message:', msgError);
            return NextResponse.json({ error: 'Failed to insert message' }, { status: 500 });
        }

        // 7. Trigger Automations
        await executeAutomationTrigger(workspaceId, 'new_message', {
            text: payload.text,
            conversation_id: conversationId,
            workspace_id: workspaceId,
            contact_id: contactId
        });

        // 8. Success
        return NextResponse.json({
            success: true,
            conversation_id: conversationId,
            contact_id: contactId
        });

    } catch (error) {
        console.error('Inbound Webhook Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
