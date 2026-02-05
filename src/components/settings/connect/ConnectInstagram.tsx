import { useState, useEffect } from 'react';

export default function ConnectInstagram() {
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [sdkReady, setSdkReady] = useState(false);
    const [debugDetails, setDebugDetails] = useState<any>(null);

    // Check Facebook SDK readiness
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

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<{
        connected: boolean;
        accountName?: string;
        accountId?: string;
    } | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/channels/status');
            const data = await res.json();
            if (data.connected) {
                setConnectionStatus(data);
            } else {
                setConnectionStatus({ connected: false });
            }
        } catch (err) {
            console.error('Error fetching status:', err);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleDisconnect = async () => {
        if (!confirm('¿Estás seguro de que quieres desconectar Instagram?')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/channels/disconnect', { method: 'POST' });
            if (res.ok) {
                alert('Desconectado exitosamente');
                setConnectionStatus({ connected: false });
            } else {
                const data = await res.json();
                setErrorMessage(data.error || 'Error al desconectar');
            }
        } catch (err: any) {
            setErrorMessage('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const [visualLogs, setVisualLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setVisualLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    const handleFacebookLogin = () => {
        addLog('TRACE 1: Botón presionado. Iniciando FB.login...');
        alert('TRACE 1: Botón presionado');
        if (!sdkReady) {
            addLog('ERROR: SDK no listo todavía.');
            alert('⚠️ TRACE ERROR: SDK no listo todavía.');
            return;
        }

        setLoading(true);
        setDebugDetails(null);
        setErrorMessage(null);

        console.log('Abriendo ventana de Facebook...');

        // FB.login DEBE ser llamado directamente en el handler para evitar bloqueadores de popups
        // @ts-ignore
        FB.login(function (response) {
            addLog('TRACE 2: Respuesta popup recibida. Status: ' + response.status);
            alert('TRACE 2: Respuesta de popup recibida. Status: ' + response.status);
            console.log('Respuesta de Facebook:', response);

            if (response.authResponse) {
                addLog('TRACE 3: Autorización exitosa. Obteniendo token...');
                alert('TRACE 3: Autorización exitosa. Procediendo al servidor...');
                const token = response.authResponse.accessToken;
                sendTokenToBackend(token);
            } else {
                setLoading(false);
                addLog('TRACE 4: Fallo/Cancelación. No hay authResponse.');
                alert('TRACE 4: Fallo/Cancelación. No hay authResponse.');
            }
        }, {
            scope: 'instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata,pages_read_engagement,pages_messaging,business_management',
            auth_type: 'rerequest'
        });
    };

    const sendTokenToBackend = (shortLivedToken: string) => {
        addLog('TRACE 5: Enviando petición al Backend...');
        alert('TRACE 5: Petición enviada al Backend.');
        console.log('Enviando token al servidor...');

        fetch('/api/channels/oauth/facebook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortLivedToken })
        })
            .then(async res => {
                const data = await res.json();
                addLog(`TRACE 6: Respuesta servida. Status: ${res.status}, Success: ${data.success}`);
                alert(`TRACE 6: Respuesta del servidor recibida (Status: ${res.status}, Success: ${data.success})`);

                if (res.ok && data.success) {
                    addLog('✅ ¡ÉXITO TOTAL!');
                    alert(`✅ ¡ÉXITO! Conectado a: ${data.account}`);
                    fetchStatus();
                } else {
                    const msg = data.error || 'Error al procesar la cuenta';
                    setErrorMessage(msg);
                    addLog('❌ ERROR BACKEND: ' + msg);
                    alert(`❌ TRACE ERROR BACKEND: ${msg}`);
                    if (data.debug) setDebugDetails(data.debug);
                }
            })
            .catch(err => {
                addLog('❌ ERROR RED: ' + err.message);
                alert('❌ TRACE ERROR RED: ' + err.message);
                setErrorMessage('Error de conexión');
            })
            .finally(() => setLoading(false));
    };

    const handleSaveManual = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const response = await fetch('/api/channels/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel: 'instagram_dm', credentials }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al guardar la configuración');
            }

            alert('Canal conectado exitosamente');
            fetchStatus();
        } catch (error: any) {
            console.error('Error saving channel:', error);
            setErrorMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="space-y-8 max-w-2xl">
            {/* Status Card (Always visible if we have info) */}
            {connectionStatus?.connected ? (
                <div className="bg-[#1a1a1a] rounded-lg border border-green-500/30 p-6 shadow-lg shadow-green-500/5">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl">
                                📸
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Cuenta Conectada</h3>
                                <p className="text-gray-400 text-sm">Estas recibiendo mensajes de:</p>
                                <p className="text-green-400 font-mono font-bold mt-1">{connectionStatus.accountName}</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full border border-green-500/20">
                            ACTIVO
                        </span>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex gap-4">
                        <button
                            onClick={handleDisconnect}
                            disabled={loading}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-md text-sm font-bold transition-all border border-red-500/20 disabled:opacity-50"
                        >
                            {loading ? 'Procesando...' : 'Desconectar Cuenta'}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Quick Connect */}
                    <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden mb-8">
                        {/* Header */}
                        <div className="p-8 border-b border-[#262626] bg-gradient-to-r from-[#1a1a1a] to-[#202020]">
                            <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-pink-500 text-white rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg shadow-pink-500/10">
                                📸
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Conectar Instagram DM</h3>
                            <p className="text-gray-400 leading-relaxed max-w-lg">
                                Gestiona todos tus mensajes directos, comentarios y menciones de Instagram desde un solo lugar.
                            </p>
                        </div>

                        {/* Body */}
                        <div className="p-8 bg-[#151515]">
                            {/* ERROR DISPLAY */}
                            {errorMessage && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg text-sm font-medium">
                                    🚨 {errorMessage}
                                </div>
                            )}

                            {/* DEBUG DISPLAY */}
                            {debugDetails && (
                                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-sm font-mono overflow-auto max-h-60">
                                    <p className="text-red-400 font-bold mb-2">Diagnóstico de Conexión:</p>
                                    <ul className="space-y-2">
                                        {debugDetails.map((page: any, i: number) => (
                                            <li key={i} className="border-b border-white/10 pb-2">
                                                <div><span className="text-blue-400">Página:</span> {page.pageName} (ID: {page.pageId})</div>
                                                <div><span className="text-purple-400">Instagram Vinculado:</span> {page.hasInstagramField ? '✅ SÍ' : '❌ NO'}</div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {typeof window !== 'undefined' && window.location.protocol === 'http:' && (
                                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-md text-sm">
                                    ⚠️ Facebook requiere conexión segura (HTTPS). Por favor accede a través de la URL de ngrok.
                                </div>
                            )}

                            <button
                                onClick={handleFacebookLogin}
                                disabled={loading || !sdkReady}
                                className="group w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-lg py-4 px-6 rounded-xl transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(24,119,242,0.2)] hover:shadow-[0_0_30px_rgba(24,119,242,0.4)] flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>Conectando...</>
                                ) : (
                                    <>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="opacity-80 group-hover:scale-110 transition-transform"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        {!sdkReady ? 'Cargando SDK...' : 'Conectar con Facebook'}
                                    </>
                                )}
                            </button>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <button
                                    onClick={fetchStatus}
                                    className="px-4 py-2 bg-[#262626] text-gray-400 rounded-lg hover:bg-[#333] transition-colors text-xs font-medium border border-white/5"
                                >
                                    🔄 Sincronizar Estado
                                </button>
                                {/* Placeholder for Manual Toggle if needed */}
                            </div>
                        </div>
                    </div>

                    {/* Console Debug Section */}
                    <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-4 font-mono text-xs">
                        <div className="flex justify-between items-center mb-2 border-b border-[#262626] pb-2">
                            <span className="text-[#a3a3a3] font-bold">🖥️ CONSOLA DE DIAGNÓSTICO:</span>
                            <button onClick={() => setVisualLogs([])} className="text-gray-500 hover:text-white">Limpiar</button>
                        </div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {visualLogs.length === 0 ? (
                                <p className="text-gray-600">Esperando actividad...</p>
                            ) : (
                                visualLogs.map((log, i) => (
                                    <p key={i} className={log.includes('ERROR') ? 'text-red-400' : 'text-green-400'}>{log}</p>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Manual Configuration */}
                    <div className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-6">
                        <h3 className="text-xl font-medium text-[#e5e5e5] mb-4">Configuración Manual</h3>
                        <div className="bg-[#262626]/50 rounded-lg p-5 border border-[#404040] mb-6">
                            <h4 className="text-[#e5e5e5] font-medium mb-3 flex items-center gap-2">
                                <span>📚</span> Cómo obtener las credenciales
                            </h4>
                            <ul className="list-disc list-inside space-y-2 text-sm text-[#a3a3a3]">
                                <li>Opción A (Fácil): Usa el botón de arriba para conectar con Facebook automáticamente.</li>
                                <li>Opción B (Manual): Sigue los pasos de developers.facebook.com para obtener el token manualmente.</li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                                    Access Token (Opcional si usas el botón)
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors font-mono text-sm"
                                    onChange={(e) => setCredentials({ ...credentials, access_token: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                                    Facebook Page ID (Opcional si usas el botón)
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors font-mono text-sm"
                                    onChange={(e) => setCredentials({ ...credentials, page_id: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                                    Instagram Account ID (Opcional si usas el botón)
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors font-mono text-sm"
                                    onChange={(e) => setCredentials({ ...credentials, instagram_account_id: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleSaveManual}
                                    disabled={loading}
                                    className="px-6 py-2 bg-[#262626] text-white rounded-md hover:bg-[#3b82f6] transition-colors"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Manualmente'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
