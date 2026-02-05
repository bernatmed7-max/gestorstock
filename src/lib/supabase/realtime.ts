'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from './client';
import { Message, Conversation } from '@/types';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Hook to subscribe to real-time messages for a conversation
 */
export function useRealtimeMessages(conversationId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addMessage = useCallback((newMessage: Message) => {
        setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) {
                return prev;
            }
            return [...prev, newMessage].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
        });
    }, []);

    const updateMessage = useCallback((updatedMessage: Message) => {
        setMessages(prev =>
            prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
        );
    }, []);

    useEffect(() => {
        if (!conversationId) return;

        const supabase = createClient();
        let channel: RealtimeChannel;

        const setupSubscription = async () => {
            channel = supabase
                .channel(`messages:${conversationId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `conversation_id=eq.${conversationId}`,
                    },
                    (payload: RealtimePostgresChangesPayload<Message>) => {
                        if (payload.new && 'id' in payload.new) {
                            addMessage(payload.new as Message);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'messages',
                        filter: `conversation_id=eq.${conversationId}`,
                    },
                    (payload: RealtimePostgresChangesPayload<Message>) => {
                        if (payload.new && 'id' in payload.new) {
                            updateMessage(payload.new as Message);
                        }
                    }
                )
                .subscribe((status) => {
                    setIsConnected(status === 'SUBSCRIBED');
                    if (status === 'CHANNEL_ERROR') {
                        setError('Error connecting to real-time updates');
                    }
                });
        };

        setupSubscription();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [conversationId, addMessage, updateMessage]);

    return { messages, setMessages, isConnected, error, addMessage };
}

/**
 * Hook to subscribe to real-time conversation updates for a workspace
 */
export function useRealtimeConversations(workspaceId: string) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addOrUpdateConversation = useCallback((conv: Conversation) => {
        setConversations(prev => {
            const existingIndex = prev.findIndex(c => c.id === conv.id);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = conv;
                return updated.sort(
                    (a, b) => new Date(b.last_message_at || b.created_at).getTime()
                        - new Date(a.last_message_at || a.created_at).getTime()
                );
            }
            return [conv, ...prev];
        });
    }, []);

    useEffect(() => {
        if (!workspaceId) return;

        const supabase = createClient();
        let channel: RealtimeChannel;

        const setupSubscription = async () => {
            channel = supabase
                .channel(`conversations:${workspaceId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'conversations',
                        filter: `workspace_id=eq.${workspaceId}`,
                    },
                    (payload: RealtimePostgresChangesPayload<Conversation>) => {
                        if (payload.eventType === 'DELETE') {
                            if (payload.old && 'id' in payload.old) {
                                setConversations(prev =>
                                    prev.filter(c => c.id !== (payload.old as Conversation).id)
                                );
                            }
                        } else if (payload.new && 'id' in payload.new) {
                            addOrUpdateConversation(payload.new as Conversation);
                        }
                    }
                )
                .subscribe((status) => {
                    setIsConnected(status === 'SUBSCRIBED');
                    if (status === 'CHANNEL_ERROR') {
                        setError('Error connecting to real-time updates');
                    }
                });
        };

        setupSubscription();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [workspaceId, addOrUpdateConversation]);

    return { conversations, setConversations, isConnected, error };
}

/**
 * Hook to subscribe to real-time job status updates
 */
export function useRealtimeJobStatus(jobId: string) {
    const [status, setStatus] = useState<string>('pending');
    const [output, setOutput] = useState<Record<string, unknown> | null>(null);
    const [error, setError] = useState<Record<string, unknown> | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!jobId) return;

        const supabase = createClient();
        let channel: RealtimeChannel;

        const setupSubscription = async () => {
            channel = supabase
                .channel(`job:${jobId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'jobs',
                        filter: `id=eq.${jobId}`,
                    },
                    (payload) => {
                        if (payload.new && 'status' in payload.new) {
                            const job = payload.new as {
                                status: string;
                                output?: Record<string, unknown>;
                                error?: Record<string, unknown>
                            };
                            setStatus(job.status);
                            if (job.output) setOutput(job.output);
                            if (job.error) setError(job.error);
                        }
                    }
                )
                .subscribe((subStatus) => {
                    setIsConnected(subStatus === 'SUBSCRIBED');
                });
        };

        setupSubscription();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [jobId]);

    return { status, output, error, isConnected };
}
