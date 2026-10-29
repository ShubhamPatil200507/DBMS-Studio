import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { setupRoutes } from '../../src/routes';
import { signAuthToken, hashPassword } from '../../src/auth/authService';
import pool, { query } from '../../src/database/connection';
import http from 'http';

describe('Authentication & Project Ownership Authorization Integration Tests', () => {
    let server: http.Server;
    let baseUrl: string;

    const userA = { id: 8881, email: 'alice.researcher@example.com', name: 'Alice Researcher', role: 'user' as const };
    const userB = { id: 8882, email: 'bob.auditor@example.com', name: 'Bob Auditor', role: 'user' as const };
    const adminUser = { id: 8883, email: 'admin.auditor@example.com', name: 'Admin Auditor', role: 'admin' as const };

    let tokenUserA: string;
    let tokenUserB: string;
    let tokenAdmin: string;
    let createdProjectId: number;

    before(async () => {
        tokenUserA = signAuthToken(userA);
        tokenUserB = signAuthToken(userB);
        tokenAdmin = signAuthToken(adminUser);

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
            await query(
                'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email)',
                [adminUser.id, adminUser.name, adminUser.email, dummyHash]
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
            await query('DELETE FROM users WHERE id IN (?, ?, ?)', [userA.id, userB.id, adminUser.id]);
        } catch (err) {
            // Ignore cleanup error
        }

        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });

        try {
            await pool.end();
        } catch (err) {
            // Ignore pool close error
        }
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

    // --- PRIORITY 1 & 2 SPECIFIC TESTS ---

    it('13. Rejects registration password shorter than 8 characters (400)', async () => {
        const res = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Weak Password User',
                email: 'weak.pass@example.com',
                password: 'short' // 5 chars
            })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 400);
        assert.ok(data.error.includes('at least 8 characters'));
    });

    it('14. Rejects registration password of exactly 6 or 7 characters (400)', async () => {
        const res = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Six Char User',
                email: 'six.pass@example.com',
                password: 'pass12' // 6 chars
            })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 400);
        assert.ok(data.error.includes('at least 8 characters'));
    });

    it('15. Rejects registration with malformed inputs (invalid email, missing name)', async () => {
        const res = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: '',
                email: 'not-an-email',
                password: 'validPassword123'
            })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 400);
        assert.ok(data.error);
    });

    it('16. Rejects registration of duplicate email with 409 Conflict', async () => {
        const res = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Alice Duplicate',
                email: userA.email, // already exists
                password: 'ValidPassword123!'
            })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 409);
        assert.ok(data.error.includes('already exists'));
    });

    it('17. Rejects login with incorrect password (401)', async () => {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userA.email,
                password: 'WrongPassword123!'
            })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 401);
        assert.equal(data.error, 'Invalid email or password');
    });

    it('18. Rejects non-admin user from accessing administrative database audit (403 Forbidden)', async () => {
        const res = await fetch(`${baseUrl}/api/security/database-audit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenUserA}` // standard user role
            },
            body: JSON.stringify({ host: 'localhost', port: 3306 })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 403);
        assert.ok(data.error.includes('Administrative authorization required'));
    });

    it('19. Rejects unauthenticated caller from SQL execution sandbox (401)', async () => {
        const res = await fetch(`${baseUrl}/api/sql/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: 'SELECT 1;' })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 401);
        assert.ok(data.error.includes('Missing Authorization header'));
    });

    it('20. SQL execution sandbox strictly rejects prohibited non-read-only commands (403)', async () => {
        const prohibitedCommands = [
            'INSERT INTO users (name) VALUES ("hack");',
            'UPDATE users SET name = "hack";',
            'DROP TABLE users;',
            'SELECT 1 INTO OUTFILE "/tmp/leak.txt";',
            'SELECT SLEEP(10);'
        ];

        for (const sql of prohibitedCommands) {
            const res = await fetch(`${baseUrl}/api/sql/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenUserA}`
                },
                body: JSON.stringify({ sql })
            });
            const data = await res.json() as any;

            assert.equal(res.status, 403, `Query "${sql}" must be rejected with 403`);
            assert.ok(data.error.includes('Security Exception'));
        }
    });

    it('21. SQL execution sandbox executes valid read-only query for authenticated user', async () => {
        const res = await fetch(`${baseUrl}/api/sql/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenUserA}`
            },
            body: JSON.stringify({ sql: 'SELECT 1 AS probe;' })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(data.results));
        assert.equal(data.results[0].probe, 1);
    });
});
