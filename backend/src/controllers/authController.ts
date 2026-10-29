import { Request, Response } from 'express';
import { query } from '../database/connection';
import { hashPassword, verifyPassword, signAuthToken } from '../auth/authService';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            res.status(400).json({ error: 'Request body must be a valid JSON object' });
            return;
        }

        const { name, email, password } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: 'Valid name is required (1-100 characters)' });
            return;
        }

        const trimmedName = name.trim();
        if (trimmedName.length > 100) {
            res.status(400).json({ error: 'Name must not exceed 100 characters' });
            return;
        }

        if (!email || typeof email !== 'string') {
            res.status(400).json({ error: 'Valid email address is required' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail.length > 254 || !EMAIL_REGEX.test(normalizedEmail)) {
            res.status(400).json({ error: 'Valid email format is required (max 254 characters)' });
            return;
        }

        if (!password || typeof password !== 'string') {
            res.status(400).json({ error: 'Password must be provided as a string' });
            return;
        }

        // Strict 8-character minimum aligned with security policy
        if (password.length < 8) {
            res.status(400).json({ error: 'Password must be at least 8 characters long' });
            return;
        }

        if (password.length > 128) {
            res.status(400).json({ error: 'Password must not exceed 128 characters' });
            return;
        }

        // Pre-check for existing account
        const existingUsers: any = await query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
            res.status(409).json({ error: 'An account with this email address already exists' });
            return;
        }

        const password_hash = await hashPassword(password);

        try {
            const result: any = await query(
                'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
                [trimmedName, normalizedEmail, password_hash]
            );

            const newUserId = result.insertId;
            const user = { id: newUserId, email: normalizedEmail, name: trimmedName, role: 'user' as const };
            const token = signAuthToken(user);

            res.status(201).json({
                message: 'User registered successfully',
                token,
                user
            });
        } catch (dbErr: any) {
            // Handle concurrent duplicate-registration race condition gracefully
            if (dbErr.code === 'ER_DUP_ENTRY' || dbErr.errno === 1062 || dbErr.message?.includes('Duplicate entry')) {
                res.status(409).json({ error: 'An account with this email address already exists' });
                return;
            }
            throw dbErr;
        }
    } catch (error: any) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Failed to register user account' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            res.status(400).json({ error: 'Request body must be a valid JSON object' });
            return;
        }

        const { email, password } = req.body;

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            res.status(400).json({ error: 'Email and password must be provided as valid non-empty strings' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        const users: any = await query(
            'SELECT id, name, email, password_hash FROM users WHERE email = ?',
            [normalizedEmail]
        );

        if (!Array.isArray(users) || users.length === 0) {
            // Constant-time dummy verification to mitigate timing-based user enumeration
            await verifyPassword('dummy_password_timing_pad', '00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        const userRow = users[0];
        const isValid = await verifyPassword(password, userRow.password_hash);

        if (!isValid) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        // Determine if account holds administrative designation
        const isAdmin = userRow.email === process.env.ADMIN_EMAIL || userRow.id === 1;
        const user = {
            id: userRow.id,
            email: userRow.email,
            name: userRow.name,
            role: (isAdmin ? 'admin' : 'user') as 'admin' | 'user'
        };
        const token = signAuthToken(user);

        res.json({
            message: 'Login successful',
            token,
            user
        });
    } catch (error: any) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Failed to process login request' });
    }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    res.json({ user: req.user });
};
