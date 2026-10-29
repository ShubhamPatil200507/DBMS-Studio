import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Validates that JWT_SECRET is explicitly configured in the environment
 * and meets the minimum cryptographic strength requirement (>= 32 characters).
 * Fails fast with an explicit error without printing the secret value.
 */
export function validateJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || typeof secret !== 'string') {
        throw new Error(
            'FATAL SECURITY CONFIGURATION: JWT_SECRET environment variable is missing or empty. ' +
            'A cryptographically secure secret (minimum 32 characters) must be configured in environment variables. ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }

    const trimmed = secret.trim();
    if (trimmed.length < MIN_JWT_SECRET_LENGTH) {
        throw new Error(
            `FATAL SECURITY CONFIGURATION: JWT_SECRET does not meet the minimum length requirement. ` +
            `Configured secret is ${trimmed.length} characters long; at least ${MIN_JWT_SECRET_LENGTH} characters are required.`
        );
    }

    return trimmed;
}

export function getJwtSecret(): string {
    return validateJwtSecret();
}

export interface UserTokenPayload {
    id: number;
    email: string;
    name: string;
    role?: 'admin' | 'user';
}

/**
 * Derives a cryptographically secure password hash using scrypt with random salt.
 */
export async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

/**
 * Verifies a password against the stored salt:hash string.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const parts = storedHash.split(':');
        if (parts.length !== 2) {
            return resolve(false);
        }
        const [salt, key] = parts;
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) return reject(err);
            const keyBuffer = Buffer.from(key, 'hex');
            const match = crypto.timingSafeEqual(derivedKey, keyBuffer);
            resolve(match);
        });
    });
}

/**
 * Signs a verified JSON Web Token with user claims.
 * Refuses to sign if JWT_SECRET is missing or does not meet strength requirements.
 */
export function signAuthToken(user: UserTokenPayload, expiresIn?: string): string {
    const secret = getJwtSecret();
    const expiry = expiresIn || process.env.JWT_EXPIRES_IN || '24h';

    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'user'
        },
        secret,
        {
            algorithm: 'HS256',
            expiresIn: expiry as any
        }
    );
}

/**
 * Verifies an incoming JWT and returns the decoded payload.
 * Throws on expired, malformed, or signature-mismatched tokens.
 */
export function verifyAuthToken(token: string): { userId: number; email: string; name: string; role: 'admin' | 'user' } {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
    if (!decoded || typeof decoded.userId !== 'number') {
        throw new Error('Invalid token payload: missing userId');
    }
    return {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role === 'admin' ? 'admin' : 'user'
    };
}
