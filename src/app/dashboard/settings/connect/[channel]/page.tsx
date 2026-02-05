'use client';

import { use } from 'react';
import ConnectMeta from '@/components/settings/connect/ConnectMeta';
import ConnectEmail from '@/components/settings/connect/ConnectEmail';
import ConnectTelegram from '@/components/settings/connect/ConnectTelegram';
import Link from 'next/link';

export default function ConnectPage({ params }: { params: Promise<{ channel: string }> }) {
    const resolvedParams = use(params);
    const { channel } = resolvedParams;

    const renderContent = () => {
        switch (channel) {
            case 'instagram_dm':
            case 'whatsapp_business':
                return <ConnectMeta />;
            case 'email':
                return <ConnectEmail />;
            case 'telegram_bot':
                return <ConnectTelegram />;
            default:
                return <div className="text-white">Canal no encontrado</div>;
        }
    };

    const getChannelName = () => {
        switch (channel) {
            case 'instagram_dm': return 'Instagram DM';
            case 'whatsapp_business': return 'WhatsApp Business';
            case 'email': return 'Email';
            case 'telegram_bot': return 'Telegram Bot';
            default: return 'Canal desconocido';
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <Link
                    href="/dashboard/settings"
                    className="text-[#3b82f6] hover:underline mb-4 inline-block text-sm"
                >
                    ← Volver a Configuración
                </Link>
                <h1 className="text-2xl font-light text-[#e5e5e5]">
                    Conectar {getChannelName()}
                </h1>
            </div>

            {renderContent()}
        </div>
    );
}
