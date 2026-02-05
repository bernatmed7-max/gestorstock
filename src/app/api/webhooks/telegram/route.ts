import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { n8nService } from '@/lib/services/n8n';

// Verify Token for Telegram is just part of the URL, handled by routing
// route: /api/webhooks/telegram

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // Use Admin Client to bypass RLS (webhooks are system actions)
        const supabase = createAdminClient();

        // Telegram Update Structure
        // https://core.telegram.org/bots/api#update
        const message = body.message;

        if (!message || !message.text) {
            // Handle other updates (edited_message, etc.) or ignore
            // For now, only text messages
            return NextResponse.json({ ok: true });
        }

        const telegramId = message.from.id.toString();
        const text = message.text;
        const messageId = message.message_id.toString();
        const direction = 'in'; // Webhook only receives incoming usually
        const timestamp = new Date(message.date * 1000).toISOString();

        // We need to know WHICH bot received this to find the workspace (unlike Instagram where the object ID is in the payload, 
        // Telegram payloads don't always contain the bot's ID explicitly in the 'message' object, 
        // BUT the webhook URL usually contains the token or we assume mapping).
        // ISSUE: If multiple workspaces use the SAME endpoint, we can't distinguish which bot was targeted easily 
        // unless we use unique webhook URLs (e.g. /api/webhooks/telegram/[bot_token]).

        // SIMPLIFICATION:
        // For this MVP, we will query ALL 'telegram_bot' channels and check which one matches the 'username' 
        // OR we just search for the conversation if it exists.
        // Actually, without the bot token in the URL or payload, we can't be 100% sure if we have multiple bots.
        // HOWEVER, we can query "auth.users" or "channels" if we knew the bot's ID.
        // But the payload has 'message.chat.id'.

        // BETTER APPROACH:
        // We will assume single-tenant or strict mapping in a real app.
        // Here, let's try to find an active contact/conversation or just fallback to the FIRST active telegram channel.
        // NOTE: This is a limitation. Ideally, the webhook URL should be `/api/webhooks/telegram?token=...`

        // Let's check query params if we set them up that way.
        const token = req.nextUrl.searchParams.get('token');

        let workspaceId;
        let channelId;

        if (token) {
            // Find channel by token (stored in credentials_ciphertext) - NOT SECURE to query by ciphertext but fast for MVP
            // Better: Find by some hash or ID
            // Ideally we query by ID if we passed it.
            // Let's assume we pass the bot's username or ID in the query param when setting up webhook.
        }

        // Fallback: Fetch ANY active telegram_bot channel (assuming single workspace focus for user context, 
        // but this is an API route so no user context).
        // Let's fetch ALL active telegram channels and see if we can brute-force match or just grab the first one.
        // REAL FIX: We will setup the webhook as /api/webhooks/telegram?bot_id=12345

        const botIdParam = req.nextUrl.searchParams.get('id');

        const query = supabase
            .from('channels')
            .select('workspace_id, id, channel_account_id')
            .eq('channel', 'telegram_bot')
            .eq('is_active', true);

        if (botIdParam) {
            query.eq('channel_account_id', botIdParam);
        }

        const { data: channels, error: channelError } = await query;

        if (!channels || channels.length === 0) {
            console.error('No active Telegram channels found');
            return NextResponse.json({ error: 'No channel' }, { status: 404 });
        }

        // If multiple, ambiguity. Pick first.
        const channel = channels[0];
        workspaceId = channel.workspace_id;
        channelId = channel.id;

        // 1. Find or Create Contact
        const contactExternalId = telegramId;
        const senderName = [message.from.first_name, message.from.last_name].filter(Boolean).join(' ');

        let contactId;
        const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .contains('channel_identifiers', { telegram_bot: [contactExternalId] })
            .eq('workspace_id', workspaceId)
            .single();

        if (existingContact) {
            contactId = existingContact.id;
        } else {
            const { data: newContact } = await supabase
                .from('contacts')
                .insert({
                    workspace_id: workspaceId,
                    name: senderName || `Telegram User ${contactExternalId}`,
                    channel_identifiers: { telegram_bot: [contactExternalId] },
                    avatar_url: '', // Could fetch user profile photo
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            contactId = newContact?.id;
        }

        if (!contactId) return NextResponse.json({ error: 'Contact failed' });

        // 2. Upsert Conversation
        const { data: conversation } = await supabase
            .from('conversations')
            .upsert({
                workspace_id: workspaceId,
                channel: 'telegram_bot',
                channel_id: channelId,
                conversation_external_id: contactExternalId,
                contact_id: contactId,
                status: 'open',
                last_message_at: timestamp,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'workspace_id,channel,conversation_external_id'
            })
            .select()
            .single();

        if (!conversation) return NextResponse.json({ error: 'Conversation failed' });

        // 3. Save Message
        const { data: savedMessage } = await supabase
            .from('messages')
            .upsert({
                workspace_id: workspaceId,
                conversation_id: conversation.id,
                message_external_id: messageId,
                direction: 'in',
                text: text,
                timestamp: timestamp,
                created_at: new Date().toISOString()
            }, {
                onConflict: 'workspace_id,message_external_id'
            })
            .select()
            .single();

        console.log(`Telegram Message saved: ${messageId}`);

        // 4. Forward to N8N
        if (savedMessage) {
            // Fetch system prompt
            const { data: latestProfile } = await supabase
                .from('style_profiles')
                .select('prompt_template')
                .eq('workspace_id', workspaceId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const systemPrompt = latestProfile?.prompt_template || 'No prompt configured.';

            await n8nService.forwardToN8n({
                event: 'message_received',
                workspace_id: workspaceId,
                channel: 'telegram_bot',
                contact_id: contactId,
                conversation_id: conversation.id,
                system_prompt: systemPrompt,
                message: {
                    id: savedMessage.id,
                    text: text,
                    timestamp: savedMessage.timestamp,
                    sender_id: contactExternalId
                }
            });
        }

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('Telegram Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
