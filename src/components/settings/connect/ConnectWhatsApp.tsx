'use client';

import { useState, useEffect } from 'react';

export default function ConnectWhatsApp() {
    const [loading, setLoading] = useState(false);
    const [sdkReady, setSdkReady] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [status, setStatus] = useState<{ connected: boolean; number?: string } | null>(null);

    // Initial Status Check
    useEffect(() => {
        checkStatus();
    }, []);

    // Wait for FB SDK
    useEffect(() => {
        // @ts-ignore
        if (window.FB_READY) {
            setSdkReady(true);
        } else {
            const handleReady = () => setSdkReady(true);
            window.addEventListener('fb-sdk-ready', handleReady);
            return () => window.removeEventListener('fb-sdk-ready', handleReady);
        }
    }, []);

    const checkStatus = async () => {
        try {
            // Reusing the generic status endpoint or we could create a specific one
            const res = await fetch('/api/channels/status?type=whatsapp_business');
            const data = await res.json();
            if (data.connected && data.type === 'whatsapp_business') {
                setStatus({ connected: true, number: data.name });
            }
        } catch (e) {
            console.error('Status check failed', e);
        }
    };

    const handleEmbeddedSignup = () => {
        if (!sdkReady) return;
        setLoading(true);
        setErrorMessage(null);

        console.log('🚀 Starting WhatsApp Embedded Signup...');

        // @ts-ignore
        FB.login(function (response) {
            if (response.authResponse) {
                const code = response.authResponse.accessToken; // Valid for generic access
                // NOTE: For true Embedded Signup, we might get a 'code' if utilizing the System User flow, 
                // but standard FB.login returns an accessToken which we can use to query.

                console.log('✅ FB Login Success. Token received.');
                connectWithBackend(code);
            } else {
                console.log('❌ User cancelled login or did not fully authorize.');
                setLoading(false);
            }
        }, {
            // Scopes required for WhatsApp Business Management
            scope: 'whatsapp_business_management, whatsapp_business_messaging'
        });
    };

    const connectWithBackend = async (token: string) => {
        try {
            const res = await fetch('/api/channels/oauth/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shortLivedToken: token })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert(`✅ ¡WhatsApp Conectado! Número: ${data.account}`);
                setStatus({ connected: true, number: data.account });
            } else {
                setErrorMessage(data.error || 'Error al conectar con el servidor.');
            }
        } catch (err: any) {
            setErrorMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('¿Desconectar WhatsApp Business?')) return;
        try {
            await fetch('/api/channels/disconnect?type=whatsapp_business', { method: 'POST' });
            setStatus(null);
            alert('Desconectado correctamente.');
        } catch (e) {
            alert('Error al desconectar');
        }
    };

    if (status?.connected) {
        return (
            <div className="bg-[#1a1a1a] rounded-lg border border-green-500/30 p-6 shadow-lg shadow-green-500/5 max-w-2xl">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-2xl">
                            💬
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">WhatsApp Business</h3>
                            <p className="text-gray-400 text-sm">Conectado al número:</p>
                            <p className="text-green-400 font-mono font-bold mt-1 text-lg">{status.number}</p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full border border-green-500/20">
                        ACTIVO
                    </span>
                </div>
                <div className="mt-8 pt-6 border-t border-white/5 flex gap-4">
                    <button
                        onClick={handleDisconnect}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                    >
                        Desconectar
                    </button>
                    {/* Placeholder for future detailed settings */}
                    <button className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                        Configurar Plantillas
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-[#262626] bg-gradient-to-r from-[#1a1a1a] to-[#202020]">
                    <div className="w-16 h-16 bg-[#25D366]/20 text-[#25D366] rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg shadow-[#25D366]/10">
                        💬
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Conectar WhatsApp Business</h3>
                    <p className="text-gray-400 leading-relaxed max-w-lg">
                        Integra tu cuenta oficial de WhatsApp Business para enviar campañas, responder mensajes y automatizar tu atención al cliente.
                    </p>
                </div>

                {/* Body */}
                <div className="p-8 bg-[#151515]">
                    {errorMessage && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg text-sm font-medium flex items-center gap-3">
                            <span>🚨</span>
                            {errorMessage}
                        </div>
                    )}

                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                API Oficial
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                Multi-agente
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Verificado
                            </div>
                        </div>

                        <button
                            onClick={handleEmbeddedSignup}
                            disabled={loading || !sdkReady}
                            className="group relative w-full bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-lg py-4 px-6 rounded-xl transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,211,102,0.2)] hover:shadow-[0_0_30px_rgba(37,211,102,0.4)]"
                        >
                            <span className="flex items-center justify-center gap-3">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Conectando...
                                    </>
                                ) : (
                                    <>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="opacity-80 group-hover:scale-110 transition-transform"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487 2.982 1.288 3.585.86 4.23.805.651-.055 2.031-.83 2.318-1.631.287-.801.322-1.631.223-1.799z" /></svg>
                                        Iniciar con Facebook
                                    </>
                                )}
                            </span>
                        </button>

                        <p className="text-center text-[#555] text-xs mt-2">
                            Se abrirá una ventana emergente de Facebook para seleccionar tu cuenta.
                        </p>
                    </div>
                </div>
            </div>

            {/* Superchat-style Features Grid */}
            <div className="grid grid-cols-2 gap-4 opacity-50 pointer-events-none grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#262626]">
                    <h4 className="text-white font-bold mb-1">Plantillas</h4>
                    <p className="text-xs text-gray-500">Envía mensajes proactivos aprobados.</p>
                </div>
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#262626]">
                    <h4 className="text-white font-bold mb-1">Catálogo</h4>
                    <p className="text-xs text-gray-500">Sincroniza tus productos.</p>
                </div>
            </div>
        </div>
    );
}
