'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Channel } from '@/types';
import StyleProfileWizard from '@/components/settings/StyleProfileWizard';
import { createClient } from '@/lib/supabase/client';

interface Integration {
    id: string;
    name: string;
    icon: string;
    description: string;
    status: 'active' | 'inactive' | 'coming_soon';
    color: string;
    bg: string;
    border: string;
    channelData?: any; // Store channel info if connected
}

export default function SettingsPage() {
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [hasAgentConfig, setHasAgentConfig] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [integrations, setIntegrations] = useState<Integration[]>([]);

    useEffect(() => {
        checkAgentStatus();
        loadIntegrations();
    }, [isWizardOpen]); // Re-check when wizard closes

    const checkAgentStatus = async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            console.log('🔍 Checking Agent Status for user:', user?.id);

            if (!user) return;

            const { data: workspaceUser, error: wsError } = await supabase
                .from('workspace_users')
                .select('workspace_id')
                .eq('user_id', user.id)
                .single();

            if (wsError) {
                console.error('❌ Error fetching workspace:', wsError);
            }

            if (workspaceUser) {
                console.log('📂 Found Workspace:', workspaceUser.workspace_id);
                const { count, error: countError } = await supabase
                    .from('style_profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('workspace_id', workspaceUser.workspace_id);

                if (countError) {
                    console.error('❌ Error fetching profiles:', countError);
                }

                console.log('📊 Agent Profile Count:', count);
                setHasAgentConfig(count ? count > 0 : false);
            } else {
                console.warn('⚠️ No workspace found for user');
                setHasAgentConfig(false);
            }
        } catch (error) {
            console.error('Error checking agent status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async (channelId: string, integrationName: string) => {
        if (!confirm(`¿Desconectar ${integrationName}?`)) return;

        const supabase = createClient();
        const { error } = await supabase
            .from('channels')
            .update({ is_active: false })
            .eq('id', channelId);

        if (error) {
            alert('Error al desconectar: ' + error.message);
        } else {
            alert('Desconectado exitosamente');
            loadIntegrations(); // Refresh
        }
    };

    const loadIntegrations = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single();

        if (!workspaceUser) return;

        // Fetch all active channels for this workspace
        const { data: channels } = await supabase
            .from('channels')
            .select('*')
            .eq('workspace_id', workspaceUser.workspace_id)
            .eq('is_active', true);

        // Map channels to integration IDs
        const channelMap = new Map();
        channels?.forEach(ch => {
            channelMap.set(ch.channel, ch);
        });

        // Define integrations with dynamic status
        const baseIntegrations: Integration[] = [
            {
                id: 'whatsapp_business',
                name: 'WhatsApp Business',
                icon: '💬',
                description: 'Conecta tu número oficial para enviar campañas y automatizaciones.',
                status: channelMap.has('whatsapp_business') ? 'active' : 'inactive',
                color: 'text-green-500',
                bg: 'bg-green-500/10',
                border: 'border-green-500/20',
                channelData: channelMap.get('whatsapp_business')
            },
            {
                id: 'instagram_dm',
                name: 'Instagram DM',
                icon: '📸',
                description: 'Gestiona mensajes directos y comentarios de múltiples cuentas.',
                status: channelMap.has('instagram_dm') ? 'active' : 'inactive',
                color: 'text-pink-500',
                bg: 'bg-pink-500/10',
                border: 'border-pink-500/20',
                channelData: channelMap.get('instagram_dm')
            },
            {
                id: 'email',
                name: 'Email & SMS',
                icon: '📧',
                description: 'Centraliza tus correos y mensajes de texto en una sola bandeja.',
                status: 'coming_soon',
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/20'
            },
            {
                id: 'telegram_bot',
                name: 'Telegram Bot',
                icon: '🤖',
                description: 'Conecta tu bot de Telegram para recibir y responder mensajes.',
                status: channelMap.has('telegram_bot') ? 'active' : 'inactive',
                color: 'text-sky-500',
                bg: 'bg-sky-500/10',
                border: 'border-sky-500/20',
                channelData: channelMap.get('telegram_bot')
            },
        ];

        setIntegrations(baseIntegrations);
    };

    return (
        <div className="container mx-auto px-6 py-10 max-w-6xl">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Integraciones</h1>
                    <p className="text-gray-400">Gestiona tus canales de comunicación y herramientas externas.</p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${!hasAgentConfig && !isLoading
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 animate-pulse'
                        : 'bg-[#262626] hover:bg-[#333] text-gray-300 border border-white/5'
                        }`}
                >
                    {!hasAgentConfig && !isLoading && <span>⚠️</span>}
                    ⚙️ {hasAgentConfig ? 'Configurar IA' : 'Configurar Agente (Requerido)'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((integration) => {
                    const isLocked = !hasAgentConfig && !isLoading;

                    return (
                        <div
                            key={integration.id}
                            className={`group relative bg-[#1a1a1a] rounded-xl border border-[#262626] p-6 transition-all ${isLocked
                                ? 'opacity-50 cursor-not-allowed grayscale'
                                : 'hover:border-[#404040] hover:shadow-xl hover:shadow-black/20'
                                } ${integration.status === 'coming_soon' ? 'opacity-60 grayscale' : ''}`}
                        >
                            {isLocked && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px] rounded-xl">
                                    <div className="bg-[#111] border border-[#333] px-3 py-1.5 rounded-full flex items-center gap-2 shadow-2xl">
                                        <span className="text-xs font-medium text-gray-300">🔒 Requiere Agente</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${integration.bg} ${integration.color} ${integration.border} border`}>
                                    {integration.icon}
                                </div>
                                {integration.status === 'active' && !isLocked && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider rounded border border-green-500/20">
                                            Conectado
                                        </span>
                                    </div>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                {integration.name}
                            </h3>

                            {integration.status === 'active' && integration.channelData?.name && (
                                <p className="text-xs text-gray-400 mb-2 font-mono">
                                    📱 {integration.channelData.name}
                                </p>
                            )}

                            <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                {integration.description}
                            </p>

                            {integration.status !== 'coming_soon' ? (
                                <div className="relative z-20">
                                    {isLocked ? (
                                        <button disabled className="block w-full py-2.5 px-4 bg-[#202020] text-gray-500 text-center rounded-lg text-sm font-medium border border-[#262626] cursor-not-allowed">
                                            Bloqueado
                                        </button>
                                    ) : integration.status === 'active' ? (
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/dashboard/settings/connect/${integration.id}`}
                                                className="flex-1 py-2.5 px-4 bg-[#262626] hover:bg-[#333] text-white text-center rounded-lg text-sm font-medium transition-colors border border-white/5 group-hover:border-white/10"
                                            >
                                                ⚙️ Editar
                                            </Link>
                                            <button
                                                onClick={() => handleDisconnect(integration.channelData.id, integration.name)}
                                                className="py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors border border-red-500/20 hover:border-red-500/30"
                                            >
                                                🔌
                                            </button>
                                        </div>
                                    ) : (
                                        <Link
                                            href={`/dashboard/settings/connect/${integration.id}`}
                                            className="block w-full py-2.5 px-4 bg-[#262626] hover:bg-[#333] text-white text-center rounded-lg text-sm font-medium transition-colors border border-white/5 group-hover:border-white/10"
                                        >
                                            Conectar
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <button disabled className="block w-full py-2.5 px-4 bg-[#202020] text-gray-500 text-center rounded-lg text-sm font-medium cursor-not-allowed border border-[#262626]">
                                    Próximamente
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Zapier / Webhooks Card */}
                <div className="group relative bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-xl border border-[#262626] p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[240px] hover:border-[#404040] transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center text-xl text-gray-400 group-hover:scale-110 transition-transform">
                        ⚡
                    </div>
                    <h3 className="text-white font-bold">API & Webhooks</h3>
                    <p className="text-xs text-gray-500 max-w-[200px]">Conecta con Zapier, Make o tu backend personalizado.</p>
                </div>
            </div>

            <StyleProfileWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
            />
        </div>
    );
}
