'use client';

export default function CampaignsPage() {
    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-[#0f0f0f] text-[#e5e5e5] p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-light mb-1">Campañas</h1>
                    <p className="text-[#a3a3a3]">Gestiona envíos masivos de WhatsApp y Email</p>
                </div>
                <button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg transition-colors">
                    + Nueva Campaña
                </button>
            </div>

            {/* Campaign Statistics Mock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#262626]">
                    <div className="text-[#a3a3a3] text-sm mb-2">Campañas Activas</div>
                    <div className="text-3xl font-light">3</div>
                </div>
                <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#262626]">
                    <div className="text-[#a3a3a3] text-sm mb-2">Mensajes Enviados (Mes)</div>
                    <div className="text-3xl font-light">12,450</div>
                </div>
                <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#262626]">
                    <div className="text-[#a3a3a3] text-sm mb-2">Tasa de Apertura</div>
                    <div className="text-3xl font-light text-[#4ade80]">68%</div>
                </div>
            </div>

            {/* Campaigns List */}
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-[#262626] text-[#a3a3a3] text-xs uppercase">
                        <tr>
                            <th className="p-4">Nombre</th>
                            <th className="p-4">Canal</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Enviados</th>
                            <th className="p-4">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626]">
                        <tr className="hover:bg-[#262626]/50">
                            <td className="p-4">Promo Verano 2026</td>
                            <td className="p-4"><span className="text-xs px-2 py-0.5 rounded bg-[#1a3a1a] text-[#4ade80]">WhatsApp</span></td>
                            <td className="p-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    Enviado
                                </span>
                            </td>
                            <td className="p-4">5,200</td>
                            <td className="p-4 text-[#a3a3a3]">24 Ene 2026</td>
                        </tr>
                        <tr className="hover:bg-[#262626]/50">
                            <td className="p-4">Newsletter Semanal #42</td>
                            <td className="p-4"><span className="text-xs px-2 py-0.5 rounded bg-[#3a2a1a] text-[#fbbf24]">Email</span></td>
                            <td className="p-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    Programado
                                </span>
                            </td>
                            <td className="p-4">-</td>
                            <td className="p-4 text-[#a3a3a3]">28 Ene 2026</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
