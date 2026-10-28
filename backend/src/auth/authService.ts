import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || 'dbms_studio_jwt_default_secret_key_change_in_production_2026';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';

export interface UserTokenPayload {
    id: number;
    email: string;
    name: string;
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
 */
export function signAuthToken(user: UserTokenPayload, expiresIn: string = JWT_EXPIRES_IN): string {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            name: user.name
        },
        JWT_SECRET,
        {
            algorithm: 'HS256',
            expiresIn: expiresIn as any
        }
    );
}

/**
 * Verifies an incoming JWT and returns the decoded payload.
 * Throws on expired, malformed, or signature-mismatched tokens.
 */
export function verifyAuthToken(token: string): { userId: number; email: string; name: string } {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    if (!decoded || typeof decoded.userId !== 'number') {
        throw new Error('Invalid token payload: missing userId');
    }
    return {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name
    };
}
