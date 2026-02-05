import { Message } from '@/types';

export function MessageBubble({ message }: { message: Message }) {
    const isOutgoing = message.direction === 'out';
    const time = new Date(message.timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[70%] rounded-lg px-4 py-2.5 ${isOutgoing
                        ? 'bg-[#3b82f6] text-white'
                        : 'bg-[#1a1a1a] text-[#e5e5e5] border border-[#262626]'
                    }`}
            >
                {message.text && <p className="text-sm leading-relaxed">{message.text}</p>}
                {message.attachments && Array.isArray(message.attachments) && (
                    <div className="mt-2 space-y-2">
                        {message.attachments.map((att: any, idx: number) => (
                            <div key={idx} className="text-xs opacity-75">
                                📎 {att.name}
                            </div>
                        ))}
                    </div>
                )}
                <p className={`text-xs mt-1.5 ${isOutgoing ? 'text-blue-100' : 'text-[#a3a3a3]'}`}>
                    {time}
                </p>
            </div>
        </div>
    );
}
