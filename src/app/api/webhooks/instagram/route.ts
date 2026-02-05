import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { instagramService } from '@/lib/services/instagram';
import { n8nService } from '@/lib/services/n8n';

// Verify Token used in Facebook App Dashboard -> Webhooks -> Instagram
// This should be an environment variable
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'social-crm-verify-token';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return new NextResponse(challenge);
        } else {
            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Validate payload structure
        if (body.object === 'instagram') {
            const supabase = await createClient();

            // Iterate over each entry
            for (const entry of body.entry) {
                const instagramId = entry.id; // The Business Account ID

                // 2. Iterate over messaging events
                // Note: Instagram Webhooks structure might differ slightly depending on subscription
                // Typically: entry.messaging or entry.changes
                const messages = entry.messaging || [];

                for (const event of messages) {
                    // Check if it's a message
                    if (event.message) {
                        await processMessage(event, instagramId, supabase);
                    }
                }
            }

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Event not supported' }, { status: 404 });
        }

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function processMessage(event: any, instagramId: string, supabase: any) {
    const senderId = event.sender.id;
    const recipientId = event.recipient.id;
    const timestamp = event.timestamp;
    const text = event.message.text;
    const messageId = event.message.mid;

    // Determine direction
    // If sender key matches our Instagram ID, it's outgoing.
    // However, in webhooks, usually we receive incoming messages where sender is the user.
    // We might also receive echoes for outgoing.
    const direction = senderId === instagramId ? 'out' : 'in';

    // 1. Find Workspace & Channel
    // We need to find which workspace acts as this Instagram Account
    const { data: channel } = await supabase
        .from('channels')
        .select('workspace_id, id, credentials_ciphertext, credentials_iv')
        .eq('channel', 'instagram_dm')
        .eq('channel_account_id', instagramId) // or recipientId if direction is 'in'
        .single();

    // If we can't find the channel by exact ID, it might be the recipient
    const accountIdToFind = direction === 'in' ? recipientId : senderId;

    // Improved channel lookup
    // If direction is 'in', recipient is the business page.
    // IF direction is 'out', sender is the business page.

    if (!channel) {
        console.warn(`Channel not found for account ${accountIdToFind}`);
        return;
    }

    const workspaceId = channel.workspace_id;

    // 2. Find or Create Contact
    const contactExternalId = direction === 'in' ? senderId : recipientId;

    let contactId;
    const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .contains('channel_identifiers', { instagram_dm: [contactExternalId] })
        .eq('workspace_id', workspaceId)
        .single();

    if (existingContact) {
        contactId = existingContact.id;
    } else {
        // We might want to fetch profile info here using the token if available
        // For now, create with ID
        const { data: newContact } = await supabase
            .from('contacts')
            .insert({
                workspace_id: workspaceId,
                name: `Instagram User ${contactExternalId.slice(0, 4)}`, // Placeholder
                channel_identifiers: { instagram_dm: [contactExternalId] },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        contactId = newContact?.id;
    }

    if (!contactId) return;

    // 3. Upsert Conversation
    // For Instagram, we can use a combination of IDs or just find the open one for this contact
    // Simplification: One active conversation per contact per channel
    const { data: conversation } = await supabase
        .from('conversations')
        .upsert({
            workspace_id: workspaceId,
            channel: 'instagram_dm',
            conversation_external_id: contactExternalId, // Match the ID used during initial sync (t_...)
            contact_id: contactId,
            status: 'open',
            last_message_at: new Date(timestamp).toISOString(),
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'workspace_id,channel,conversation_external_id'
        })
        .select()
        .single();

    if (!conversation) return;

    // 4. Save Message
    const { data: savedMessage } = await supabase
        .from('messages')
        .upsert({
            workspace_id: workspaceId,
            conversation_id: conversation.id,
            message_external_id: messageId,
            direction,
            text: text || '',
            timestamp: new Date(timestamp).toISOString(),
            created_at: new Date(timestamp).toISOString() // Use original timestamp
        }, {
            onConflict: 'workspace_id,conversation_id,message_external_id'
        })
        .select()
        .single();

    console.log(`Message saved: ${messageId}`);

    // 5. Forward to n8n (Only for incoming messages)
    if (direction === 'in' && savedMessage) {
        // Fetch the latest Agent Prompt for this workspace
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
            channel: 'instagram_dm',
            contact_id: contactId,
            conversation_id: conversation.id,
            system_prompt: systemPrompt, // <--- INJECTED PROMPT
            message: {
                id: savedMessage.id,
                text: text,
                timestamp: savedMessage.timestamp,
                sender_id: senderId
            }
        });
    }
}
