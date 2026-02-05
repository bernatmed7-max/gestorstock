import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { botToken } = await req.json();

        if (!botToken) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        // Determine base URL
        // In production, use standard env var. In dev, we might not have a public URL.
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tu-dominio.com';

        // Warning if localhost
        if (appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
            console.warn('⚠️ Cannot set Telegram Webhook to localhost. Need ngrok or public domain.');
            return NextResponse.json({
                warning: 'Localhost detectado. No se puede configurar Webhook automático sin túnel (ngrok).',
                ok: true // Return OK so UI doesn't break, but warn console
            });
        }

        // We fetch "getMe" to get the ID to append to the URL query param for routing
        const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const meData = await meRes.json();

        if (!meData.ok) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        const botId = meData.result.id;
        const webhookUrl = `${appUrl}/api/webhooks/telegram?id=${botId}`;

        const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.description);
        }

        return NextResponse.json({ success: true, detailed_result: data });

    } catch (error: any) {
        console.error('Webhook Setup Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
