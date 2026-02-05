export const n8nService = {
    async forwardToN8n(payload: any) {
        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        if (!webhookUrl) {
            console.warn('N8N_WEBHOOK_URL not configured');
            return;
        }

        try {
            console.log('Forwarding to n8n:', JSON.stringify(payload, null, 2)); // Debug log

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add authentication if needed
                    // 'X-N8N-Secret': process.env.N8N_WEBHOOK_SECRET
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`n8n webhook failed: ${response.status} ${response.statusText}`);
                const text = await response.text();
                console.error('n8n error response:', text);
                throw new Error(`n8n webhook failed: ${response.status}`);
            }

            console.log('Successfully forwarded to n8n');
            const data = await response.json().catch(() => ({})); // Handle empty response
            return data;

        } catch (error) {
            console.error('Error forwarding to n8n:', error);
            // Don't throw, we don't want to break the webhook response to Instagram
            return null;
        }
    }
};
