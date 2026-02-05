import { ChatList } from '@/components/inbox/ChatList';
import { ChatThread } from '@/components/inbox/ChatThread';
import { ContactSidebar } from '@/components/inbox/ContactSidebar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function InboxPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const conversationId = typeof params.id === 'string' ? params.id : null;
    let contact = null;

    if (conversationId) {
        const supabase = await createClient();
        const { data: conv } = await supabase
            .from('conversations')
            .select('*, contacts(*)')
            .eq('id', conversationId)
            .single();

        if (conv && conv.contacts) {
            contact = conv.contacts;
        }
    }

    return (
        <div className="flex h-[calc(100vh-64px)]">
            <div className="w-80 border-r border-[#262626] bg-[#1a1a1a]">
                <ChatList />
            </div>
            <div className="flex-1 flex bg-[#0f0f0f]">
                <div className="flex-1 border-r border-[#262626]">
                    <ChatThread conversationId={conversationId} />
                </div>
                {contact && (
                    <div className="w-80 border-l border-[#262626] bg-[#1a1a1a]">
                        <ContactSidebar contact={contact} onClose={() => {
                            // Since this is server component, we can't pass a client function easily that manipulates URL
                            // Ideally ContactSidebar parses URL to close, or we just rely on selecting another chat.
                            // For now passing empty function or making it client component wrapper
                        }} />
                        {/* We need a client wrapper for Close functionality if we want it to close via URL params */}
                    </div>
                )}
            </div>
        </div>
    );
}
