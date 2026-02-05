'use client';

import { useState } from 'react';

interface AIOutput {
    suggested_reply?: string;
    confidence?: number;
    intent?: string;
    urgency?: string;
}

export function AISuggestionBox({
    aiOutput,
    conversationId,
    onSend,
}: {
    aiOutput: AIOutput;
    conversationId: string;
    onSend: () => void;
}) {
    const [sending, setSending] = useState(false);

    if (!aiOutput?.suggested_reply) {
        return null;
    }

    const handleUseSuggestion = async () => {
        if (!aiOutput.suggested_reply || sending) return;

        setSending(true);
        try {
            const response = await fetch(`/api/conversations/${conversationId}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: aiOutput.suggested_reply }),
            });

            if (response.ok) {
                onSend();
            } else {
                alert('Error al enviar sugerencia');
            }
        } catch (error) {
            console.error('Error sending suggestion:', error);
            alert('Error al enviar sugerencia');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-[#1a1a2e] border-t border-[#3b82f6] p-4">
            <div className="flex items-start gap-3">
                <div className="text-[#3b82f6] text-xl">🤖</div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-[#e5e5e5]">
                            Respuesta sugerida por IA
                        </span>
                        {aiOutput.confidence && (
                            <span className="text-xs text-[#a3a3a3]">
                                (Confianza: {Math.round(aiOutput.confidence * 100)}%)
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[#e5e5e5] mb-3 bg-[#0f0f0f] p-3 rounded border border-[#262626]">
                        {aiOutput.suggested_reply}
                    </p>
                    <button
                        onClick={handleUseSuggestion}
                        disabled={sending}
                        className="bg-[#3b82f6] text-white text-sm px-4 py-1.5 rounded hover:bg-[#2563eb] disabled:opacity-50 transition-colors"
                    >
                        {sending ? 'Enviando...' : 'Usar sugerencia'}
                    </button>
                </div>
            </div>
        </div>
    );
}
