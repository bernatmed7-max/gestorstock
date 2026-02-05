import { createClient } from '@/lib/supabase/server';

const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0';

interface InstagramMessage {
    id: string;
    message: string;
    created_time: string;
    from: {
        id: string;
        username: string;
    };
    attachments?: {
        data: Array<{
            image_data?: { url: string };
            video_data?: { url: string };
        }>;
    };
}

interface InstagramConversation {
    id: string;
    updated_time: string;
    participants: {
        data: Array<{
            id: string;
            username: string;
        }>;
    };
    messages?: {
        data: InstagramMessage[];
    };
}

export const instagramService = {
    async getUserProfile(accessToken: string, userId: string) {
        try {
            const url = `${FB_GRAPH_URL}/${userId}?fields=id,name,username,profile_picture_url&access_token=${accessToken}`;
            const res = await fetch(url);
            return await res.json();
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },

    async syncMessages(accessToken: string, pageId: string, instagramId: string, workspaceId: string) {
        const supabase = await createClient();

        try {
            // 1. Fetch Conversations
            const url = `${FB_GRAPH_URL}/${instagramId}/conversations?fields=id,updated_time,participants,messages{id,message,created_time,from,attachments}&platform=instagram&access_token=${accessToken}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.error) throw new Error(data.error.message);

            const conversations: InstagramConversation[] = data.data || [];

            for (const conv of conversations) {
                // 2. Identify Contact (The other participant)
                const participant = conv.participants.data.find(p => p.id !== instagramId);
                if (!participant) continue;

                // Find or Create Contact
                let contactId;
                const { data: existingContact } = await supabase
                    .from('contacts')
                    .select('id')
                    .contains('channel_identifiers', { instagram_dm: [participant.id] })
                    .eq('workspace_id', workspaceId)
                    .single();

                if (existingContact) {
                    contactId = existingContact.id;
                } else {
                    // Fetch profile info for better contact creation
                    const profile = await this.getUserProfile(accessToken, participant.id);
                    const { data: newContact } = await supabase
                        .from('contacts')
                        .insert({
                            workspace_id: workspaceId,
                            name: profile?.name || participant.username,
                            channel_identifiers: { instagram_dm: [participant.id] },
                            avatar_url: profile?.profile_picture_url,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .select()
                        .single();
                    contactId = newContact?.id;
                }

                if (!contactId) continue;

                // 3. Upsert Conversation
                const { data: conversationData } = await supabase
                    .from('conversations')
                    .upsert({
                        workspace_id: workspaceId,
                        channel: 'instagram_dm',
                        conversation_external_id: conv.id,
                        contact_id: contactId,
                        status: 'open',
                        last_message_at: conv.updated_time,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'workspace_id,channel,conversation_external_id'
                    })
                    .select()
                    .single();

                if (!conversationData) continue;

                // 4. Upsert Messages
                if (conv.messages?.data) {
                    for (const msg of conv.messages.data.reverse()) { // Process oldest first
                        const direction = msg.from.id === instagramId ? 'out' : 'in';

                        // Extract attachments if any
                        // Simplified attachment handling
                        // @ts-ignore
                        const attachments = msg.attachments?.data?.map(att => ({
                            type: att.image_data ? 'image' : att.video_data ? 'video' : 'unknown',
                            url: att.image_data?.url || att.video_data?.url,
                            // @ts-ignore
                            id: att.id
                        })).filter(a => a.url) || [];


                        await supabase
                            .from('messages')
                            .upsert({
                                workspace_id: workspaceId,
                                conversation_id: conversationData.id,
                                message_external_id: msg.id,
                                direction,
                                text: msg.message || '',
                                attachments: attachments.length > 0 ? attachments : null,
                                timestamp: msg.created_time,
                                created_at: msg.created_time // Preserve original timestamp
                            }, {
                                onConflict: 'workspace_id,conversation_id,message_external_id'
                            });
                    }
                }
            }

            return { success: true, count: conversations.length };

        } catch (error) {
            console.error('Error syncing messages:', error);
            throw error;
        }
    },

    async sendMessage(workspaceId: string, conversationId: string, text: string) {
        const supabase = await createClient();

        try {
            // 1. Get conversation and channel info
            const { data: conv, error: convError } = await supabase
                .from('conversations')
                .select('conversation_external_id, contact_id, channel_id')
                .eq('id', conversationId)
                .single();

            if (convError || !conv) throw new Error('Conversación no encontrada');

            // 2. Get Page Access Token from Channels
            const { data: channel, error: chanError } = await supabase
                .from('channels')
                .select('credentials_ciphertext, credentials_iv, credentials_algorithm')
                .eq('workspace_id', workspaceId)
                .eq('channel', 'instagram_dm')
                .single();

            if (chanError || !channel) throw new Error('Canal de Instagram no configurado o no autorizado');

            // Decrypt credentials to get token
            const { decrypt } = await import('@/lib/crypto/encryption');
            const credentials = JSON.parse(decrypt(
                channel.credentials_ciphertext,
                channel.credentials_iv,
                channel.credentials_algorithm
            ));

            const pageAccessToken = credentials.access_token;
            const igId = conv.conversation_external_id; // For IG, conversation ID is often the same as the thread ID

            // 3. Send via Instagram Messaging API
            // Note: recipient is the external user id
            const { data: contact } = await supabase
                .from('contacts')
                .select('channel_identifiers')
                .eq('id', conv.contact_id)
                .single();

            const instagramUserId = contact?.channel_identifiers?.instagram_dm?.[0];
            if (!instagramUserId) throw new Error('ID de usuario de Instagram no encontrado en el contacto');

            const url = `${FB_GRAPH_URL}/me/messages?access_token=${pageAccessToken}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: instagramUserId },
                    message: { text }
                })
            });

            const result = await res.json();
            if (result.error) throw new Error(`IG API Error: ${result.error.message}`);

            return { success: true, external_id: result.message_id };
        } catch (error) {
            console.error('Error in sendMessage:', error);
            throw error;
        }
    }
};
