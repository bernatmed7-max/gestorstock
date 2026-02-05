'use client';

import { useState, useEffect } from 'react';

interface MetaAssets {
    pages: Array<{ id: string; name: string; access_token: string; picture?: string }>;
    instagram: Array<{ id: string; username: string; page_id: string; page_access_token: string; profile_picture_url?: string }>;
    whatsapp: Array<{
        waba_id: string;
        waba_name: string;
        phone_numbers: Array<{ id: string; display_phone_number: string; verified_name: string }>
    }>;
}

export default function ConnectMeta() {
    const [sdkReady, setSdkReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assets, setAssets] = useState<MetaAssets | null>(null);
    const [connectedAssets, setConnectedAssets] = useState<Set<string>>(new Set());

    useEffect(() => {
        // @ts-ignore
        if (window.FB) {
            setSdkReady(true);
        } else {
            // Load SDK if not present (usually loaded in layout or head)
            // @ts-ignore
            window.fbAsyncInit = function () {
                // @ts-ignore
                FB.init({
                    appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
                    cookie: true,
                    xfbml: true,
                    version: 'v19.0'
                });
                setSdkReady(true);
            };

            (function (d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) { return; }
                js = d.createElement(s); js.id = id;
                // @ts-ignore
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                // @ts-ignore
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
        }

        // Fetch initial status
        fetch('/api/channels/status')
            .then(res => res.json())
            .then(data => {
                if (data.connected && data.channels) {
                    const ids = new Set(data.channels.map((c: any) => c.id));
                    setConnectedAssets(ids as Set<string>);
                }
            })
            .catch(err => console.error('Error checking status', err));

    }, []);

    const handleLogin = () => {
        setLoading(true);
        setError(null);
        // @ts-ignore
        FB.login(function (response) {
            if (response.authResponse) {
                console.log('FB Login Success', response);
                fetchAssets(response.authResponse.accessToken);
            } else {
                console.log('User cancelled login or did not fully authorize.');
                setLoading(false);
            }
        }, {
            // Requesting all necessary permissions for IG, FB Pages, and WhatsApp
            // Note: 'whatsapp_business_management' is key for WABA
            scope: 'pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging,instagram_basic,instagram_manage_messages,whatsapp_business_management',
            auth_type: 'reauthenticate'
        });
    };

    const fetchAssets = async (token: string) => {
        try {
            const res = await fetch('/api/channels/oauth/facebook/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shortLivedToken: token })
            });
            const data = await res.json();

            if (data.success) {
                setAssets(data.assets);
                // Ideally check which are already connected in DB to mark them
            } else {
                setError(data.error || 'Error al obtener cuentas');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const connectAsset = async (type: 'whatsapp_business' | 'instagram_dm' | 'facebook_page', assetConfig: any) => {
        try {
            // Optimistic update
            const assetId = assetConfig.id || assetConfig.phone_number_id; // Normalize ID

            const res = await fetch('/api/channels/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel: type,
                    credentials: {
                        ...assetConfig
                    }
                })
            });

            const data = await res.json();

            if (data.success) {
                setConnectedAssets(prev => new Set(prev).add(assetId));
                alert('Conectado correctamente!');
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e: any) {
            alert('Error de conexión: ' + e.message);
        }
    };

    const handleDisconnect = async (type: string, accountId: string) => {
        if (!confirm('¿Desconectar esta cuenta?')) return;
        try {
            const res = await fetch(`/api/channels/disconnect?type=${type}&account_id=${accountId}`, {
                method: 'POST'
            });
            if (res.ok) {
                setConnectedAssets(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(accountId);
                    return newSet;
                });
                alert('Desconectado');
            } else {
                alert('Error al desconectar');
            }
        } catch (e) {
            console.error('Disconnect failed', e);
        }
    };

    if (!assets) {
        return (
            <div className="border border-[#262626] rounded-xl p-8 bg-[#1a1a1a] text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                    ♾️
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Conectar con Meta</h3>
                <p className="text-gray-400 text-sm mb-6">
                    Inicia sesión para conceder permisos y seleccionar tus cuentas de Facebook, Instagram y WhatsApp.
                </p>

                {error && <div className="mb-4 text-red-500 text-sm bg-red-500/10 p-2 rounded">{error}</div>}

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                    {loading ? 'Cargando...' : 'Continuar con Facebook'}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Activos Disponibles</h2>
                <button
                    onClick={() => {
                        setAssets(null);
                        // @ts-ignore
                        if (window.FB) window.FB.logout();
                    }}
                    className="text-sm text-gray-500 hover:text-white"
                >
                    Cambiar cuenta
                </button>
            </div>

            {/* Instagram */}
            {assets.instagram && assets.instagram.length > 0 && (
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-pink-500">📸</span> Instagram Business
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assets.instagram.map(ig => (
                            <div key={ig.id} className="bg-[#151515] border border-[#262626] p-4 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {ig.profile_picture_url ? (
                                        <img src={ig.profile_picture_url} className="w-10 h-10 rounded-full" alt={ig.username} />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center font-bold">IG</div>
                                    )}
                                    <div>
                                        <div className="text-white font-medium">{ig.username}</div>
                                        <div className="text-xs text-gray-500">ID: {ig.id}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (connectedAssets.has(ig.id)) {
                                            handleDisconnect('instagram_dm', ig.id);
                                        } else {
                                            connectAsset('instagram_dm', {
                                                page_id: ig.page_id,
                                                access_token: ig.page_access_token,
                                                instagram_account_id: ig.id
                                            });
                                        }
                                    }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${connectedAssets.has(ig.id) ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white text-black hover:bg-gray-200'}`}
                                >
                                    {connectedAssets.has(ig.id) ? 'Desconectar' : 'Conectar'}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* WhatsApp */}
            {assets.whatsapp && assets.whatsapp.length > 0 && (
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-green-500">💬</span> WhatsApp Business
                    </h3>
                    <div className="space-y-4">
                        {assets.whatsapp.map(waba => (
                            <div key={waba.waba_id} className="bg-[#151515] border border-[#262626] rounded-lg overflow-hidden">
                                <div className="px-4 py-2 bg-[#202020] border-b border-[#262626] text-xs font-bold text-gray-400 uppercase">
                                    {waba.waba_name}
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {waba.phone_numbers.map((phone: any) => (
                                        <div key={phone.id} className="flex items-center justify-between bg-black/20 p-3 rounded">
                                            <div>
                                                <div className="text-white font-medium">{phone.verified_name || phone.display_phone_number}</div>
                                                <div className="text-xs text-gray-500">{phone.display_phone_number}</div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (connectedAssets.has(phone.id)) {
                                                        handleDisconnect('whatsapp_business', phone.id);
                                                    } else {
                                                        connectAsset('whatsapp_business', {
                                                            phone_number_id: phone.id,
                                                            waba_id: waba.waba_id,
                                                            access_token: assets.pages[0]?.access_token
                                                        });
                                                    }
                                                }}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${connectedAssets.has(phone.id) ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white text-black hover:bg-gray-200'}`}
                                            >
                                                {connectedAssets.has(phone.id) ? 'Desconectar' : 'Conectar'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Pages (Optional, usually for Messenger) */}
            {assets.pages && assets.pages.length > 0 && (
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-blue-500">f</span> Facebook Pages
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assets.pages.map(page => (
                            <div key={page.id} className="bg-[#151515] border border-[#262626] p-4 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                                        {page.picture ? <img src={page.picture} className="w-full h-full rounded-full" /> : 'P'}
                                    </div>
                                    <div>
                                        <div className="text-white font-medium">{page.name}</div>
                                        <div className="text-xs text-gray-500">ID: {page.id}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (connectedAssets.has(page.id)) {
                                            handleDisconnect('facebook_page', page.id);
                                        } else {
                                            connectAsset('facebook_page', {
                                                page_id: page.id,
                                                access_token: page.access_token
                                            });
                                        }
                                    }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${connectedAssets.has(page.id) ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white text-black hover:bg-gray-200'}`}
                                >
                                    {connectedAssets.has(page.id) ? 'Desconectar' : 'Conectar'}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {(!assets.instagram?.length && !assets.whatsapp?.length && !assets.pages?.length) && (
                <div className="text-center text-gray-500 py-10">
                    No se encontraron activos. Asegúrate de tener cuentas de empresa vinculadas.
                </div>
            )}
        </div>
    );
}
