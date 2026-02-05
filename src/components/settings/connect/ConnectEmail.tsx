'use client';

import { useState } from 'react';

export default function ConnectEmail() {
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState<Record<string, string>>({});

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/channels/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel: 'email', credentials }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al guardar la configuración');
            }

            alert('Email conectado exitosamente');
            window.location.href = '/dashboard/settings';
        } catch (error: any) {
            console.error('Error saving channel:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl">
            <div className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-6">
                <h3 className="text-xl font-medium text-[#e5e5e5] mb-4">Configuración Email (SMTP)</h3>

                <div className="bg-[#262626]/50 rounded-lg p-5 border border-[#404040] mb-6">
                    <h4 className="text-[#e5e5e5] font-medium mb-3 flex items-center gap-2">
                        <span>📚</span> Información requerida
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-[#a3a3a3]">
                        <li>Necesitas un servidor SMTP o un servicio como SendGrid, Resend o AWS SES.</li>
                        <li>Obtén las credenciales SMTP de tu proveedor.</li>
                        <li>Asegúrate de que los puertos (587 o 465) estén abiertos.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#a3a3a3] mb-2">SMTP Host</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors font-mono text-sm"
                            onChange={(e) => setCredentials({ ...credentials, smtp_host: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#a3a3a3] mb-2">SMTP Port</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors font-mono text-sm"
                            onChange={(e) => setCredentials({ ...credentials, smtp_port: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#a3a3a3] mb-2">SMTP Username</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors font-mono text-sm"
                            onChange={(e) => setCredentials({ ...credentials, smtp_user: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#a3a3a3] mb-2">SMTP Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors font-mono text-sm"
                            onChange={(e) => setCredentials({ ...credentials, smtp_pass: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-6 py-2 bg-[#3b82f6] text-white rounded-md hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
