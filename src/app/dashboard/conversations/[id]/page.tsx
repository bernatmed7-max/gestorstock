import { ChatList } from '@/components/inbox/ChatList';
import { ChatThread } from '@/components/inbox/ChatThread';

export default async function ConversationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return (
        <div className="flex h-[calc(100vh-64px)]">
            <div className="w-1/3 border-r border-[#262626] bg-[#1a1a1a]">
                <ChatList />
            </div>
            <div className="flex-1 bg-[#0f0f0f]">
                <ChatThread conversationId={id} />
            </div>
        </div>
    );
}
