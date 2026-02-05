'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Channel } from '@/types';

interface ConversationPreview {
    id: string;
    channel: Channel;
    status: string;
    last_message_at: string | null;
    email_subject?: string;
    message_count: number;
    last_message_text?: string;
}

interface ContactData {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    channel_identifiers: Record<string, string[]>;
    conversations: ConversationPreview[];
}

interface ContactConversationsProps {
    contactId: string;
}

export function ContactConversations({ contactId }: ContactConversationsProps) {
    const [contact, setContact] = useState<ContactData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedChannel, setSelectedChannel] = useState<Channel | 'all'>('all');

    useEffect(() => {
        loadContactData();
    }, [contactId]);

    const loadContactData = async () => {
        try {
            const response = await fetch(`/api/contacts/${contactId}`);
            const data = await response.json();
            setContact(data);
        } catch (error) {
            console.error('Error loading contact:', error);
        } finally {
            setLoading(false);
        }
    };

    const getChannelIcon = (channel: Channel) => {
        switch (channel) {
            case 'instagram_dm':
                return '📷';
            case 'whatsapp_business':
                return '💬';
            case 'email':
                return '📧';
            default:
                return '💬';
        }
    };

    const getChannelName = (channel: Channel) => {
        switch (channel) {
            case 'instagram_dm':
                return 'Instagram DM';
            case 'whatsapp_business':
                return 'WhatsApp';
            case 'email':
                return 'Email';
            default:
                return channel;
        }
    };

    const formatTime = (timestamp: string | null) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-[#a3a3a3]">
                Cargando conversaciones del contacto...
            </div>
        );
    }

    if (!contact) {
        return (
            <div className="p-6 text-center text-red-400">
                Error al cargar el contacto
            </div>
        );
    }

    const filteredConversations = selectedChannel === 'all'
        ? contact.conversations
        : contact.conversations.filter(c => c.channel === selectedChannel);

    const channelCounts = contact.conversations.reduce((acc, conv) => {
        acc[conv.channel] = (acc[conv.channel] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="h-full flex flex-col bg-[#0f0f0f]">
            {/* Contact Header */}
            <div className="bg-[#1a1a1a] border-b border-[#262626] p-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-2xl font-medium text-white">
                        {contact.name?.charAt(0) || contact.email?.charAt(0) || '?'}
                    </div>
                    <div>
                        <h2 className="text-xl font-medium text-[#e5e5e5]">
                            {contact.name || 'Sin nombre'}
                        </h2>
                        {contact.email && (
                            <p className="text-[#a3a3a3]">{contact.email}</p>
                        )}
                        {contact.phone && (
                            <p className="text-[#a3a3a3]">{contact.phone}</p>
                        )}
                    </div>
                </div>

                {/* Channel Identifiers */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(contact.channel_identifiers).map(([channel, ids]) => (
                        ids.map((id, idx) => (
                            <span
                                key={`${channel}-${idx}`}
                                className="text-xs px-2 py-1 rounded bg-[#262626] text-[#a3a3a3]"
                            >
                                {getChannelIcon(channel as Channel)} {id}
                            </span>
                        ))
                    ))}
                </div>
            </div>

            {/* Channel Filter */}
            <div className="bg-[#1a1a1a] border-b border-[#262626] p-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedChannel('all')}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${selectedChannel === 'all'
                                ? 'bg-[#3b82f6] text-white'
                                : 'bg-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5]'
                            }`}
                    >
                        Todos ({contact.conversations.length})
                    </button>
                    {Object.entries(channelCounts).map(([channel, count]) => (
                        <button
                            key={channel}
                            onClick={() => setSelectedChannel(channel as Channel)}
                            className={`px-3 py-1.5 rounded text-sm transition-colors ${selectedChannel === channel
                                    ? 'bg-[#3b82f6] text-white'
                                    : 'bg-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5]'
                                }`}
                        >
                            {getChannelIcon(channel as Channel)} {getChannelName(channel as Channel)} ({count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                    <div className="p-6 text-center text-[#a3a3a3]">
                        No hay conversaciones {selectedChannel !== 'all' && `en ${getChannelName(selectedChannel)}`}
                    </div>
                ) : (
                    filteredConversations.map((conv) => (
                        <Link
                            key={conv.id}
                            href={`/dashboard/conversations/${conv.id}`}
                            className="block p-4 border-b border-[#262626] hover:bg-[#1a1a1a] transition-colors"
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{getChannelIcon(conv.channel)}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-[#e5e5e5]">
                                            {getChannelName(conv.channel)}
                                            {conv.email_subject && `: ${conv.email_subject}`}
                                        </span>
                                        <span className="text-xs text-[#a3a3a3]">
                                            {formatTime(conv.last_message_at)}
                                        </span>
                                    </div>
                                    {conv.last_message_text && (
                                        <p className="text-sm text-[#a3a3a3] truncate">
                                            {conv.last_message_text}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-[#737373]">
                                            {conv.message_count} mensaje{conv.message_count !== 1 ? 's' : ''}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${conv.status === 'open'
                                                ? 'bg-[#1a3a1a] text-[#4ade80]'
                                                : conv.status === 'pending'
                                                    ? 'bg-[#3a3a1a] text-[#facc15]'
                                                    : 'bg-[#262626] text-[#a3a3a3]'
                                            }`}>
                                            {conv.status === 'open' ? 'Abierta' : conv.status === 'pending' ? 'Pendiente' : 'Cerrada'}
                                        </span>
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
