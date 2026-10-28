import { Request, Response } from 'express';
import { query } from '../database/connection';
import { hashPassword, verifyPassword, signAuthToken } from '../auth/authService';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: 'Valid name is required' });
            return;
        }

        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            res.status(400).json({ error: 'Valid email address is required' });
            return;
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters long' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check for existing user
        const existingUsers: any = await query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
            res.status(409).json({ error: 'An account with this email address already exists' });
            return;
        }

        const password_hash = await hashPassword(password);

        const result: any = await query(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name.trim(), normalizedEmail, password_hash]
        );

        const newUserId = result.insertId;
        const user = { id: newUserId, email: normalizedEmail, name: name.trim() };
        const token = signAuthToken(user);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user
        });
    } catch (error: any) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Failed to register user account' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const users: any = await query(
            'SELECT id, name, email, password_hash FROM users WHERE email = ?',
            [normalizedEmail]
        );

        if (!Array.isArray(users) || users.length === 0) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        const userRow = users[0];
        const isValid = await verifyPassword(String(password), userRow.password_hash);

        if (!isValid) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        const user = { id: userRow.id, email: userRow.email, name: userRow.name };
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
