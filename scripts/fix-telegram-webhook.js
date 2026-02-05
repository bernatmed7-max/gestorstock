const botToken = '8168262142:AAHBarDPd2z1HaMmgX4dnVf2l6cHciuQGlE';
const appUrl = 'https://sporophytic-yu-faster.ngrok-free.dev';
const botId = botToken.split(':')[0];
const webhookUrl = `${appUrl}/api/webhooks/telegram?id=${botId}`;

console.log(`🔗 Setting Webhook to: ${webhookUrl}`);

async function setWebhook() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=true`);
        console.log('Deleted old webhook:', await response.json());

        const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
        const data = await res.json();
        console.log('Set Webhook Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

setWebhook();
