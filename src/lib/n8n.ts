import { JobInput } from '@/types';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!;
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

interface N8nResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}

// Trigger n8n workflow for chart generation
export async function triggerN8nWorkflow(
    jobId: string,
    input: JobInput
): Promise<N8nResponse> {
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(N8N_WEBHOOK_SECRET && { 'X-Webhook-Secret': N8N_WEBHOOK_SECRET }),
            },
            body: JSON.stringify({
                job_id: jobId,
                prompt: input.prompt,
                inventario: input.inventario,
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
            }),
        });

        if (!response.ok) {
            throw new Error(`n8n webhook failed: ${response.status}`);
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

// Validate webhook signature from n8n callback
export function validateWebhookSignature(
    signature: string | null,
    timestamp: string | null
): boolean {
    if (!N8N_WEBHOOK_SECRET) {
        // If no secret configured, skip validation (development mode)
        return true;
    }

    if (!signature || !timestamp) {
        return false;
    }

    // Validate timestamp is within 5 minutes
    const timestampDate = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.abs(now.getTime() - timestampDate.getTime()) / 60000;

    if (diffMinutes > 5) {
        return false;
    }

    // Simple signature validation (can be enhanced with HMAC)
    return signature === N8N_WEBHOOK_SECRET;
}
