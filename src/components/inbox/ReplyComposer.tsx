'use client';

import { useState } from 'react';

export function ReplyComposer({
    conversationId,
    onSend,
}: {
    conversationId: string;
    onSend: () => void;
}) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || sending) return;

        setSending(true);
        try {
            const response = await fetch(`/api/conversations/${conversationId}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() }),
            });

            if (response.ok) {
                setText('');
                onSend();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error al enviar mensaje');
        } finally {
            setSending(false);
        }
    };

    return (
        <form onSubmit={handleSend} className="bg-[#1a1a1a] border-t border-[#262626] p-4">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-[#a3a3a3] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className="bg-[#3b82f6] text-white px-6 py-2.5 rounded-lg hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                    {sending ? 'Enviando...' : 'Enviar'}
                </button>
            </div>
        </form>
    );
}
