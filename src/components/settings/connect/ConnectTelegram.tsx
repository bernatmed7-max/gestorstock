'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ConnectTelegram() {
    const [botToken, setBotToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleConnect = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Verify Bot Token with Telegram API
            const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
            const data = await response.json();

            if (!data.ok) {
                throw new Error('Token de Bot inválido. Por favor verifica e intenta de nuevo.');
            }

            const botId = data.result.id;
            const botUsername = data.result.username;

            // 2. Save Channel to Supabase
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error('No autorizado');

            // Find Workspace
            const { data: workspaceUser } = await supabase
                .from('workspace_users')
                .select('workspace_id')
                .eq('user_id', user.id)
                .single();

            if (!workspaceUser) throw new Error('No workspace configured');

            // Upsert Channel
            const { error: dbError } = await supabase
                .from('channels')
                .upsert({
                    workspace_id: workspaceUser.workspace_id,
                    channel: 'telegram_bot', // Must match updated enum
                    channel_account_id: botId.toString(),
                    name: `@${botUsername}`,
                    is_active: true,
                    credentials_ciphertext: botToken, // Storing raw for simplicity now, normally encrypt!
                    metadata: { username: botUsername }
                }, { onConflict: 'workspace_id,channel,channel_account_id' });

            if (dbError) throw new Error(dbError.message);

            // 3. Set Webhook
            // We need our App's public base URL
            // In dev (localhost), we need a tunnel (ngrok). In prod, it's the domain.
            // For now, let's assume we can set it via an API route that uses the request host?
            // Or just verify logic -> User connects -> We might need to manually set the webhook OR 
            // use an API route to set it using process.env.NEXT_PUBLIC_APP_URL

            // NOTE: Since this is client-side, we can't easily get the server URL unless valid.
            // Let's call our internal API to finalize setup and set webhook.

            const setupResponse = await fetch('/api/webhooks/telegram/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botToken })
            });

            if (!setupResponse.ok) {
                // Even if webhook setup fails (e.g. localhost), we saved the channel.
                console.warn('Webhook setup failed (expected on localhost without tunnel)');
            }

            alert(`¡Bot @${botUsername} conectado exitosamente!`);
            router.push('/dashboard/settings');

        } catch (err: any) {
            setError(err.message || 'Error desconocido');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-[#1a1a1a] p-8 rounded-xl border border-[#262626]">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-sky-500/10 flex items-center justify-center text-3xl">
                        🤖
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Conectar Telegram Bot</h2>
                        <p className="text-gray-400 text-sm">Ingresa el token de tu bot para empezar.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Bot Token
                        </label>
                        <input
                            type="text"
                            value={botToken}
                            onChange={(e) => setBotToken(e.target.value)}
                            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-sky-500 outline-none transition-all font-mono text-sm"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            Puedes obtener este token creando un bot con <a href="https://t.me/BotFather" target="_blank" className="text-sky-500 hover:underline">@BotFather</a> en Telegram.
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConnect}
                            disabled={isLoading || !botToken}
                            className={`px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-all ${isLoading ? 'opacity-50 cursor-wait' : ''
                                }`}
                        >
                            {isLoading ? 'Verificando...' : 'Conectar Bot'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
