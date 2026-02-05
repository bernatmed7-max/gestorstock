'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Conversation {
    id: string;
    channel: string;
    status: string;
    last_message_at: string | null;
    contacts: {
        name: string | null;
        email: string | null;
        avatar_url: string | null;
    } | null;
}

export function ChatList() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const currentId = searchParams.get('id');
    const supabase = createClient();

    useEffect(() => {
        loadConversations();

        // Poll every 5 seconds
        const interval = setInterval(loadConversations, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadConversations = async () => {
        try {
            const response = await fetch('/api/conversations');
            const data = await response.json();
            setConversations(data.conversations || []);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'instagram_dm':
                return '📷';
            case 'whatsapp_business':
                return '💬';
            case 'email':
                return '📧';
            case 'telegram_bot':
                return '🤖';
            default:
                return '💬';
        }
    };

    const formatTime = (timestamp: string | null) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    if (loading) {
        return (
            <div className="p-4 text-center text-[#a3a3a3]">
                Cargando...
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-[#262626]">
                <h2 className="text-lg font-light text-[#e5e5e5]">Conversaciones</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="p-4 text-center text-[#a3a3a3]">
                        No hay conversaciones
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <Link
                            key={conv.id}
                            href={`/dashboard/inbox?id=${conv.id}`}
                            className={`block p-4 border-b border-[#262626] hover:bg-[#0f0f0f] transition-colors ${currentId === conv.id
                                ? 'bg-[#0f0f0f] border-l-4 border-l-[#3b82f6]'
                                : ''
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="text-2xl">
                                    {getChannelIcon(conv.channel)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-medium text-[#e5e5e5] truncate">
                                            {conv.contacts?.name || conv.contacts?.email || 'Sin nombre'}
                                        </p>
                                        <span className="text-xs text-[#a3a3a3] ml-2">
                                            {formatTime(conv.last_message_at)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-0.5 rounded bg-[#262626] text-[#a3a3a3]">
                                            {conv.channel.replace('_', ' ')}
                                        </span>
                                        {conv.status === 'open' && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-[#1a3a1a] text-[#4ade80]">
                                                Abierta
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
