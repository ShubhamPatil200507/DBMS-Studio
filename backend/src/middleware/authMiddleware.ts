import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../auth/authService';

export interface AuthenticatedUser {
    id: number;
    email: string;
    name: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

/**
 * Express middleware that enforces valid JWT Bearer token authentication.
 * Missing, malformed, or invalid tokens are rejected with 401 Unauthorized.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({ error: 'Authentication required. Missing Authorization header.' });
        return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        res.status(401).json({ error: 'Authentication required. Format must be: Bearer <token>.' });
        return;
    }

    const token = parts[1];
    try {
        const decoded = verifyAuthToken(token);
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name
        };
        next();
    } catch (err: any) {
        const message = err.name === 'TokenExpiredError' 
            ? 'Authentication token has expired. Please log in again.' 
            : 'Invalid authentication token signature or format.';
        res.status(401).json({ error: message });
        return;
    }
};
