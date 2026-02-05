import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

const ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    console.warn('⚠️  APP_ENCRYPTION_KEY not set - channel encryption disabled');
}

/**
 * Encrypt sensitive data (channel tokens/credentials)
 */
export function encrypt(plaintext: string): {
    ciphertext: string;
    iv: string;
    algorithm: string;
} {
    if (!ENCRYPTION_KEY) {
        throw new Error('APP_ENCRYPTION_KEY not configured');
    }

    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
        ciphertext: ciphertext + tag.toString('hex'),
        iv: iv.toString('hex'),
        algorithm: ALGORITHM,
    };
}

/**
 * Decrypt sensitive data
 */
export function decrypt(ciphertext: string, iv: string, algorithm: string): string {
    if (!ENCRYPTION_KEY) {
        throw new Error('APP_ENCRYPTION_KEY not configured');
    }

    if (algorithm !== ALGORITHM) {
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    
    // Extract tag from end of ciphertext
    const tag = Buffer.from(ciphertext.slice(-TAG_LENGTH * 2), 'hex');
    const encryptedData = ciphertext.slice(0, -TAG_LENGTH * 2);

    const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(encryptedData, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
}
