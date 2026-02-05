'use client';

import { useState, useEffect } from 'react';
import { Channel } from '@/types';

interface ChannelConfigModalProps {
    channel: Channel | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ChannelConfigModal({ channel, isOpen, onClose }: ChannelConfigModalProps) {
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const [loading, setLoading] = useState(false);

    // No local initialization needed, RootLayout handles it.
    useEffect(() => {
        // We could check FB readiness here if we needed to show a loading state 
        // specifically for the FB button inside the modal.
    }, [channel, isOpen]);

    const handleFacebookLogin = () => {
        alert('TRACE MODAL 1: Botón presionado');
        setLoading(true);
        // @ts-ignore
        FB.login(function (response) {
            alert('TRACE MODAL 2: Respuesta popup recibida. Status: ' + response.status);
            if (response.authResponse) {
                alert('TRACE MODAL 3: Autorización exitosa. Enviando al servidor...');
                const shortLivedToken = response.authResponse.accessToken;
                // Send to backend
                fetch('/api/channels/oauth/facebook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shortLivedToken })
                })
                    .then(res => res.json())
                    .then(data => {
                        alert(`TRACE MODAL 4: Respuesta servidor recibida. Success: ${data.success}`);
                        if (data.success) {
                            alert(`✅ ¡ÉXITO! Conectado exitosamente con: ${data.account}`);
                            onClose();
                        } else {
                            throw new Error(data.error || 'Error en el servidor');
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        alert('❌ TRACE error: ' + err.message);
                    })
                    .finally(() => setLoading(false));

            } else {
                alert('TRACE MODAL 5: Cancelado o sin authResponse.');
                setLoading(false);
            }
        }, { scope: 'instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata,pages_read_engagement,pages_messaging,business_management' });
    };

    if (!isOpen || !channel) return null;

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/channels/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel, credentials }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al guardar la configuración');
            }

            console.log(`Credentials saved for ${channel}`);
            onClose();
            // Optional: You might want to trigger a refresh of the channel list here
            // or show a success message.
            alert('Canal conectado exitosamente');
        } catch (error: any) {
            console.error('Error saving channel:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getChannelConfig = (channel: Channel) => {
        switch (channel) {
            case 'instagram_dm':
                return {
                    title: 'Configurar Instagram DM',
                    steps: [
                        'Opción A (Fácil): Usa el botón de abajo para conectar con Facebook automáticamente.',
                        'Opción B (Manual): Sigue los pasos de developers.facebook.com para obtener el token manualmente.'
                    ],
                    fields: [
                        // Keep manual fields as fallback, or hide them? Let's keep them but add the button prominently.
                        { key: 'access_token', label: 'Access Token (Opcional si usas el botón)' },
                        { key: 'page_id', label: 'Facebook Page ID (Opcional si usas el botón)' },
                        { key: 'instagram_account_id', label: 'Instagram Account ID (Opcional si usas el botón)' }
                    ],
                    extraContent: (
                        <div className="mb-6">
                            <button
                                onClick={handleFacebookLogin}
                                className="w-full bg-[#1877F2] text-white px-4 py-3 rounded-md hover:bg-[#166fe5] transition-colors flex items-center justify-center gap-3 font-medium"
                                disabled={loading}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                Conectar con Facebook / Instagram
                            </button>
                            <p className="text-xs text-[#a3a3a3] mt-2 text-center">
                                Se pedirán permisos para acceder a tus Páginas y mensajes de Instagram.
                            </p>
                        </div>
                    )
                };
            case 'whatsapp_business':
                return {
                    title: 'Configurar WhatsApp Business',
                    steps: [
                        'Ve a developers.facebook.com y crea una aplicación.',
                        'Añade el producto "WhatsApp" a tu aplicación.',
                        'En la configuración de la API de WhatsApp, obtén tu "Phone Number ID".',
                        'Genera un token de acceso permanente (o usa el temporal para pruebas).',
                        'Configura el Webhook con la URL de tu servidor.'
                    ],
                    fields: [
                        { key: 'phone_number_id', label: 'Phone Number ID' },
                        { key: 'access_token', label: 'Permanent Access Token' },
                        { key: 'verify_token', label: 'Webhook Verify Token (crea uno propio)' }
                    ]
                };
            case 'email':
                return {
                    title: 'Configurar Email (SMTP)',
                    steps: [
                        'Necesitas un servidor SMTP o un servicio como SendGrid, Resend o AWS SES.',
                        'Obtén las credenciales SMTP de tu proveedor.',
                        'Asegúrate de que los puertos (587 o 465) estén abiertos.'
                    ],
                    fields: [
                        { key: 'smtp_host', label: 'SMTP Host' },
                        { key: 'smtp_port', label: 'SMTP Port' },
                        { key: 'smtp_user', label: 'SMTP Username' },
                        { key: 'smtp_pass', label: 'SMTP Password', type: 'password' }
                    ]
                };
            default:
                return { title: '', steps: [], fields: [] };
        }
    };

    const config = getChannelConfig(channel);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#1a1a1a] sticky top-0">
                    <h2 className="text-xl font-medium text-[#e5e5e5]">{config.title}</h2>
                    <button onClick={onClose} className="text-[#a3a3a3] hover:text-white">
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* OAuth Section */}
                    {/* @ts-ignore */}
                    {config.extraContent && (
                        <div className="border-b border-[#262626] pb-6">
                            <h3 className="text-[#e5e5e5] font-medium mb-4 flex items-center gap-2">
                                <span>⚡</span> Conexión Rápida
                            </h3>
                            {/* @ts-ignore */}
                            {config.extraContent}
                        </div>
                    )}

                    {/* Instructions Section */}
                    <div className="bg-[#262626]/50 rounded-lg p-5 border border-[#404040]">
                        <h3 className="text-[#e5e5e5] font-medium mb-3 flex items-center gap-2">
                            <span>📚</span> Cómo obtener las credenciales
                        </h3>
                        <ol className="list-decimal list-inside space-y-3 text-sm text-[#a3a3a3]">
                            {config.steps.map((step, index) => (
                                <li key={index} className="leading-relaxed pl-1">{step}</li>
                            ))}
                        </ol>
                    </div>

                    {/* Credentials Form */}
                    <div className="space-y-5">
                        <h3 className="text-[#e5e5e5] font-medium border-b border-[#262626] pb-2">
                            Ingresar Credenciales
                        </h3>
                        {config.fields.map((field) => (
                            <div key={field.key}>
                                <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                                    {field.label}
                                </label>
                                <input
                                    type={(field as any).type || 'text'}
                                    className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors font-mono text-sm"
                                    placeholder={`Ingresa ${field.label}`}
                                    onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-4 bg-[#1a1a1a] border-t border-[#262626]">
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="policy-consent"
                            checked={policyAccepted}
                            onChange={(e) => setPolicyAccepted(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-[#0f0f0f] text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-gray-800"
                        />
                        <label htmlFor="policy-consent" className="text-sm text-[#a3a3a3]">
                            He leído y acepto la <a href="/policy" target="_blank" className="text-[#3b82f6] hover:underline">Política de Privacidad</a> y el procesamiento de datos por IA.
                        </label>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-[#a3a3a3] hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!policyAccepted || loading}
                            className={`px-6 py-2 rounded-md font-medium transition-colors ${policyAccepted && !loading
                                ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
                                : 'bg-[#262626] text-[#525252] cursor-not-allowed'
                                }`}
                        >
                            {loading ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
