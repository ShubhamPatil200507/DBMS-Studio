import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { setupRoutes } from '../../src/routes';
import http from 'http';

describe('Express API Route Integration Tests', () => {
    let server: http.Server;
    let baseUrl: string;

    before(async () => {
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
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    it('POST /api/sql/validate returns isValid: false for syntax errors', async () => {
        const res = await fetch(`${baseUrl}/api/sql/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: 'SELECT FROM WHERE;' })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 400);
        assert.equal(data.isValid, false);
        assert.ok(data.errors.some((e: any) => e.type === 'SYNTAX_ERROR'));
    });

    it('POST /api/sql/validate returns isValid: true for standard SQL queries', async () => {
        const res = await fetch(`${baseUrl}/api/sql/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: 'SELECT id, name FROM users WHERE id = 1;' })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 200);
        assert.equal(data.isValid, true);
    });

    it('POST /api/sql/execute rejects multiple semicolon-separated statements', async () => {
        const res = await fetch(`${baseUrl}/api/sql/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: 'SELECT 1; DROP TABLE users;' })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 403);
        assert.ok(data.error.includes('Multiple semicolon-separated SQL statements are disallowed'));
    });

    it('POST /api/sql/execute rejects destructive statements', async () => {
        const res = await fetch(`${baseUrl}/api/sql/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: 'DROP TABLE users;' })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 403);
        assert.ok(data.error.includes('Only read-only queries'));
    });

    it('POST /api/security/database-audit strictly rejects disallowed/SSRF hosts with 403', async () => {
        const res = await fetch(`${baseUrl}/api/security/database-audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                host: '169.254.169.254',
                port: 3306,
                user: 'root'
            })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 403);
        assert.ok(data.error.includes('not permitted by database auditing security policy'));
    });

    it('GET /api/security/database-audit is disabled and returns 404', async () => {
        const res = await fetch(`${baseUrl}/api/security/database-audit`);
        assert.equal(res.status, 404);
    });

    it('POST /api/fd/closure computes attribute closure via HTTP API', async () => {
        const res = await fetch(`${baseUrl}/api/fd/closure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                attributes: ['A', 'B', 'C'],
                fds: [{ left: ['A'], right: ['B'] }, { left: ['B'], right: ['C'] }],
                target: ['A']
            })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 200);
        assert.deepEqual(data.closure.sort(), ['A', 'B', 'C']);
        assert.ok(data.steps.length >= 3);
    });

    it('POST /api/fd/analyze identifies normal form via HTTP API', async () => {
        const res = await fetch(`${baseUrl}/api/fd/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                attributes: ['StudentID', 'CourseID', 'CourseName'],
                fds: [
                    { left: ['StudentID', 'CourseID'], right: ['CourseName'] },
                    { left: ['CourseID'], right: ['CourseName'] }
                ]
            })
        });
        const data = await res.json() as any;

        assert.equal(res.status, 200);
        assert.equal(data.highestForm, '1NF');
        assert.ok(data.analysis.some((a: any) => a.violation === '2NF'));
    });
});
