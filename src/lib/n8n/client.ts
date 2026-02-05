import { N8nJobInput } from '@/types';
import { generateWebhookSignature } from '@/lib/crypto/hmac';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!;
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET!;

interface N8nResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}

/**
 * Trigger n8n workflow for message analysis
 */
export async function triggerN8nWorkflow(
    input: N8nJobInput,
    callbackUrl: string
): Promise<N8nResponse> {
    try {
        if (!N8N_WEBHOOK_URL) {
            throw new Error('N8N_WEBHOOK_URL not configured');
        }

        const timestamp = new Date().toISOString();
        const payload = JSON.stringify(input);
        const signature = generateWebhookSignature(payload, timestamp);

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signature,
                'X-Timestamp': timestamp,
            },
            body: payload,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`n8n webhook failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('📊 n8n Response:', JSON.stringify(data, null, 2));
        return { success: true, data };
    } catch (error) {
        console.error('Error triggering n8n workflow:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
