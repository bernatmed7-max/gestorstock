import { createHmac, timingSafeEqual } from 'crypto';

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET!;

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateWebhookSignature(
    payload: string | object,
    timestamp: string
): string {
    const secret = WEBHOOK_SECRET;
    if (!secret) {
        throw new Error('N8N_WEBHOOK_SECRET not configured');
    }

    const payloadString = typeof payload === 'string' 
        ? payload 
        : JSON.stringify(payload);
    
    const message = `${timestamp}.${payloadString}`;
    const hmac = createHmac('sha256', secret);
    hmac.update(message);
    return hmac.digest('hex');
}

/**
 * Verify HMAC-SHA256 signature from webhook
 */
export function verifyWebhookSignature(
    signature: string | null,
    timestamp: string | null,
    payload: string | object
): boolean {
    if (!WEBHOOK_SECRET) {
        // Development mode: skip validation if no secret configured
        console.warn('⚠️  N8N_WEBHOOK_SECRET not set - skipping signature validation');
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
        console.error('❌ Webhook timestamp expired:', diffMinutes, 'minutes');
        return false;
    }

    // Generate expected signature
    const expectedSignature = generateWebhookSignature(payload, timestamp);

    // Use timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
        return false;
    }

    try {
        return timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch {
        return false;
    }
}
