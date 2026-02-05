'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { ReplyComposer } from './ReplyComposer';
import { AISuggestionBox } from './AISuggestionBox';
import { ConversationSummary } from './ConversationSummary';
import { ContactSidebar } from './ContactSidebar';
import { useRealtimeMessages, useRealtimeJobStatus } from '@/lib/supabase/realtime';
import { Message, AIOutput } from '@/types';

interface ConversationData {
    id: string;
    channel: string;
    status: string;
    messages: Message[];
    contacts: {
        name: string | null;
        email: string | null;
        phone: string | null;
        avatar_url: string | null;
    } | null;
    jobs: Array<{
        id: string;
        status: string;
        error: unknown;
    }>;
    ai_outputs: AIOutput[];
}

export function ChatThread({ conversationId }: { conversationId: string | null }) {
    const [conversation, setConversation] = useState<ConversationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [showContactSidebar, setShowContactSidebar] = useState(false);
    const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Realtime hooks
    const { messages: rtMessages, isConnected } = useRealtimeMessages(conversationId || '');
    const latestJobId = conversation?.jobs?.[0]?.id || '';
    const { status: jobStatus } = useRealtimeJobStatus(latestJobId);

    // Sync realtime messages
    useEffect(() => {
        if (rtMessages.length > 0) {
            setRealtimeMessages(rtMessages);
        }
    }, [rtMessages]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [realtimeMessages]);

    // Load initial conversation data
    useEffect(() => {
        if (!conversationId) {
            setConversation(null);
            setRealtimeMessages([]);
            return;
        }

        loadConversation();
    }, [conversationId]);

    // Sync initial messages to realtime state
    useEffect(() => {
        if (conversation?.messages && realtimeMessages.length === 0) {
            setRealtimeMessages(conversation.messages);
        }
    }, [conversation?.id]);

    // Reload when job completes (to get AI outputs)
    useEffect(() => {
        if (jobStatus === 'completed' || jobStatus === 'failed') {
            loadConversation();
        }
    }, [jobStatus]);

    const loadConversation = async () => {
        if (!conversationId) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/conversations/${conversationId}`);
            const data = await response.json();
            setConversation(data);
        } catch (error) {
            console.error('Error loading conversation:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!conversationId) {
        return (
            <div className="h-full flex items-center justify-center text-[#a3a3a3]">
                Selecciona una conversación para comenzar
            </div>
        );
    }

    if (loading && !conversation) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-[#a3a3a3]">Cargando conversación...</div>
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="h-full flex items-center justify-center text-red-400">
                Error al cargar la conversación
            </div>
        );
    }

    const hasRunningJob = jobStatus === 'pending' || jobStatus === 'running' ||
        conversation?.jobs.some(j => j.status === 'pending' || j.status === 'running');

    // Use realtime messages if available, otherwise fall back to conversation messages
    const displayMessages = realtimeMessages.length > 0 ? realtimeMessages : (conversation?.messages || []);

    return (
        <div className="h-full flex flex-col relative">
            {/* Header */}
            <div className="bg-[#1a1a1a] border-b border-[#262626] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowContactSidebar(!showContactSidebar)}
                        className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
                    >
                        👤
                    </button>
                    <div>
                        <h3 className="font-medium text-[#e5e5e5]">
                            {conversation?.contacts?.name || conversation?.contacts?.email || 'Sin nombre'}
                        </h3>
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-[#a3a3a3]">{conversation?.channel}</p>
                            {isConnected && (
                                <span className="text-xs text-green-500">● En vivo</span>
                            )}
                        </div>
                    </div>
                </div>
                {hasRunningJob && (
                    <div className="flex items-center gap-2 text-sm text-[#3b82f6]">
                        <span className="animate-pulse">●</span>
                        Analizando con IA...
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f0f0f]">
                {displayMessages.length === 0 ? (
                    <div className="text-center text-[#a3a3a3] py-8">
                        No hay mensajes aún
                    </div>
                ) : (
                    <>
                        {displayMessages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* AI Suggestion Box */}
            {conversation.ai_outputs && conversation.ai_outputs.length > 0 && (
                <AISuggestionBox
                    aiOutput={conversation.ai_outputs[0]}
                    conversationId={conversationId}
                    onSend={loadConversation}
                />
            )}

            {/* Conversation Summary */}
            {conversation.ai_outputs && conversation.ai_outputs.length > 0 && (
                <ConversationSummary aiOutput={conversation.ai_outputs[0]} />
            )}

            {/* Reply Composer */}
            <ReplyComposer
                conversationId={conversationId}
                onSend={loadConversation}
            />

            {/* Contact Sidebar */}
            {showContactSidebar && conversation.contacts && (
                <ContactSidebar
                    contact={conversation.contacts}
                    onClose={() => setShowContactSidebar(false)}
                />
            )}
        </div>
    );
}
