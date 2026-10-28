import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { setupRoutes } from '../../src/routes';
import { signAuthToken, hashPassword } from '../../src/auth/authService';
import { query } from '../../src/database/connection';
import http from 'http';

describe('Authentication & Project Ownership Authorization Integration Tests', () => {
    let server: http.Server;
    let baseUrl: string;

    const userA = { id: 8881, email: 'alice.researcher@example.com', name: 'Alice Researcher' };
    const userB = { id: 8882, email: 'bob.auditor@example.com', name: 'Bob Auditor' };

    let tokenUserA: string;
    let tokenUserB: string;
    let createdProjectId: number;

    before(async () => {
        tokenUserA = signAuthToken(userA);
        tokenUserB = signAuthToken(userB);

        // Seed users into test database satisfying foreign key constraint
        const dummyHash = await hashPassword('SecretTestPass123!');
        try {
            await query(
                'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email)',
                [userA.id, userA.name, userA.email, dummyHash]
            );
            await query(
                'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email)',
                [userB.id, userB.name, userB.email, dummyHash]
            );
        } catch (dbErr) {
            console.warn('Note: DB user seeding in test:', dbErr);
        }

        const app = express();
        app.use(express.json());
        setupRoutes(app);

        await new Promise<void>((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                const addr = server.address() as any;
                baseUrl = `http://127.0.0.1:${addr.port}`;
                resolve();
            });
        });
    });

    after(async () => {
        // Clean up created project and test users
        try {
            if (createdProjectId) {
                await query('DELETE FROM projects WHERE id = ?', [createdProjectId]);
            }
            await query('DELETE FROM users WHERE id IN (?, ?)', [userA.id, userB.id]);
        } catch (err) {
            // Ignore cleanup error
        }

        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    it('1. Rejects request with missing Authorization header (401)', async () => {
        const res = await fetch(`${baseUrl}/api/projects`, {
            method: 'GET'
        });
        const data = await res.json() as any;

        assert.equal(res.status, 401);
        assert.ok(data.error.includes('Missing Authorization header'));
    });

    it('2. Rejects request with non-Bearer Authorization scheme (401)', async () => {
        const res = await fetch(`${baseUrl}/api/projects`, {
            method: 'GET',
            headers: { 'Authorization': 'Basic dXNlcjpwYXNz' }
        });
        const data = await res.json() as any;

        assert.equal(res.status, 401);
        assert.ok(data.error.includes('Format must be: Bearer <token>'));
    });

    it('3. Rejects request with invalid/tampered JWT signature (401)', async () => {
        const tamperedToken = tokenUserA.slice(0, -6) + 'abcdef';
        const res = await fetch(`${baseUrl}/api/projects`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tamperedToken}` }
        });
        const data = await res.json() as any;

        assert.equal(res.status, 401);
        assert.ok(data.error.includes('Invalid authentication token'));
    });

    it('4. Rejects request with expired JWT token (401)', async () => {
        const expiredToken = signAuthToken(userA, '-10s');
        const res = await fetch(`${baseUrl}/api/projects`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${expiredToken}` }
        });
        const data = await res.json() as any;

        assert.equal(res.status, 401);
        assert.ok(data.error.includes('token has expired'));
    });

    it('5. Allows access to /api/auth/me with valid JWT token', async () => {
        const res = await fetch(`${baseUrl}/api/auth/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tokenUserA}` }
        });
        const data = await res.json() as any;

        assert.equal(res.status, 200);
        assert.equal(data.user.id, userA.id);
        assert.equal(data.user.email, userA.email);
    });

    it('6. User A creates a project bound to User A identity', async () => {
        const res = await fetch(`${baseUrl}/api/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenUserA}`
            },
            body: JSON.stringify({
                project_name: 'Auth Isolation Test Project',
                description: 'Testing tenant isolation',
                original_requirement: 'Multi-tenant auth test',
                database_platform: 'MySQL'
            })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 201);
        assert.ok(data.id, 'Project ID must be returned');
        createdProjectId = data.id;
    });

    it('7. User A can fetch their own project by ID', async () => {
        const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tokenUserA}` }
        });
        const data = await res.json() as any;

        assert.equal(res.status, 200);
        assert.equal(data.id, createdProjectId);
        assert.equal(data.user_id, userA.id);
    });

    it('8. Cross-User Isolation: User B CANNOT fetch User A project (404/unauthorized)', async () => {
        const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tokenUserB}` }
        });
        const data = await res.json() as any;

        assert.equal(res.status, 404);
        assert.ok(data.error.includes('not found or unauthorized'));
    });

    it('9. Cross-User Mutation: User B CANNOT update User A project', async () => {
        const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenUserB}`
            },
            body: JSON.stringify({
                project_name: 'Hijacked by User B',
                description: 'Unauthorized update'
            })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 404);
        assert.ok(data.error.includes('not found or unauthorized'));
    });

    it('10. Cross-User Mutation: User B CANNOT delete User A project', async () => {
        const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenUserB}` }
        });
        const data = await res.json() as any;

        assert.equal(res.status, 404);
        assert.ok(data.error.includes('not found or unauthorized'));
    });

    it('11. User B project list does NOT leak User A project', async () => {
        const res = await fetch(`${baseUrl}/api/projects`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tokenUserB}` }
        });
        const data = await res.json() as any;

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(data));
        const leaked = data.find((p: any) => p.id === createdProjectId);
        assert.equal(leaked, undefined, 'User A project must not appear in User B project list');
    });

    it('12. User A successfully deletes their own project', async () => {
        const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenUserA}` }
        });
        const data = await res.json() as any;

        assert.equal(res.status, 200);
        assert.equal(data.success, true);
        createdProjectId = 0; // successfully deleted
    });
});
