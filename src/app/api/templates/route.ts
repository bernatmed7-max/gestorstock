import { NextResponse } from 'next/server';

// GET /api/templates - Get approved WhatsApp templates
export async function GET() {
    // In a real scenario, this would fetch from Meta API or our DB cache
    // For now, returning mocked templates as per requirements for "sincronizadas"

    const templates = [
        {
            name: 'hello_world',
            language: 'en_US',
            status: 'APPROVED',
            category: 'MARKETING',
            components: [
                { type: 'BODY', text: 'Hello World! Welcome to our service.' }
            ]
        },
        {
            name: 'shipping_update',
            language: 'es',
            status: 'APPROVED',
            category: 'UTILITY',
            components: [
                { type: 'BODY', text: 'Tu pedido {{1}} ha sido enviado.' }
            ]
        },
        {
            name: 'welcome_message',
            language: 'es',
            status: 'APPROVED',
            category: 'MARKETING',
            components: [
                { type: 'HEADER', format: 'IMAGE' },
                { type: 'BODY', text: '¡Hola {{1}}! Gracias por contactarnos. ¿En qué podemos ayudarte hoy?' },
                { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Ver precios' }, { type: 'QUICK_REPLY', text: 'Soporte' }] }
            ]
        }
    ];

    return NextResponse.json({ data: templates });
}
