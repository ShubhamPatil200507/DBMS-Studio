import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { setupRoutes } from '../../src/routes';
import { signAuthToken } from '../../src/auth/authService';
import pool, { executeCancellableQuery } from '../../src/database/connection';
import http from 'http';

describe('Query Cancellation & Database Resource Release Integration Tests', () => {
    let server: http.Server;
    let baseUrl: string;
    let authToken: string;

    before(async () => {
        authToken = signAuthToken({ id: 995, email: 'cancel.tester@example.com', name: 'Cancel Tester', role: 'user' });

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
        try {
            await pool.end();
        } catch (e) {
            // Ignore pool close error
        }
    });

    describe('Direct Server-Side Query Cancellation (KILL QUERY Mechanism)', () => {
        it('executes fast read queries promptly within timeout limit', async () => {
            const start = performance.now();
            const results = await executeCancellableQuery('SELECT 1 + 1 AS result', 3000);
            const duration = performance.now() - start;

            assert.equal(results[0]?.result, 2);
            assert.ok(duration < 1000, `Expected fast execution, took ${duration}ms`);
        });

        it('aborts long-running query via real KILL QUERY within timeout window instead of completing', async () => {
            const start = performance.now();
            let caughtError: any = null;

            try {
                // Execute a 3-second sleep query with a strict 250ms timeout limit
                await executeCancellableQuery('SELECT SLEEP(3) AS s', 250);
            } catch (err: any) {
                caughtError = err;
            }

            const elapsedMs = performance.now() - start;

            assert.ok(caughtError !== null, 'Expected query to reject on timeout');
            assert.ok(
                caughtError.message.includes('timed out and was cancelled on database server'),
                `Unexpected error message: ${caughtError.message}`
            );
            // Must have terminated in ~250-600ms, proving it did NOT run for 3000ms
            assert.ok(
                elapsedMs < 1200,
                `Query took ${elapsedMs}ms; did not stop promptly via server cancellation.`
            );
        });

        it('proves database connection pool is immediately healthy and not exhausted after cancellation', async () => {
            // Run successive fast queries through the pool after cancellation
            for (let i = 1; i <= 3; i++) {
                const res = await executeCancellableQuery(`SELECT ${i} * 10 AS score`, 2000);
                assert.equal(res[0]?.score, i * 10);
            }
        });
    });

    describe('HTTP API Endpoint Sandbox & CTE Integration Tests', () => {
        it('POST /api/sql/execute executes safe Common Table Expression (WITH ... SELECT) returning 200', async () => {
            const safeCte = 'WITH test_numbers AS (SELECT 42 AS answer) SELECT * FROM test_numbers;';
            const res = await fetch(`${baseUrl}/api/sql/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ sql: safeCte })
            });

            const data = await res.json() as any;
            assert.equal(res.status, 200);
            assert.equal(data.results[0]?.answer, 42);
            assert.equal(data.hasCte, true);
            assert.equal(data.statementType, 'select');
        });

        it('POST /api/sql/execute strictly rejects data-modifying CTE with 403 Forbidden', async () => {
            const modifyingCte = 'WITH cte AS (SELECT 1 AS x) UPDATE users SET name = "compromised"';
            const res = await fetch(`${baseUrl}/api/sql/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ sql: modifyingCte })
            });

            const data = await res.json() as any;
            assert.equal(res.status, 403);
            assert.ok(data.error.includes("Disallowed statement type 'update'"));
        });

        it('POST /api/sql/execute strictly rejects prohibited file exports with 403 Forbidden', async () => {
            const outfileSql = 'SELECT * FROM users INTO OUTFILE "/tmp/data_exfil.txt"';
            const res = await fetch(`${baseUrl}/api/sql/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ sql: outfileSql })
            });

            const data = await res.json() as any;
            assert.equal(res.status, 403);
            assert.ok(data.error.includes('INTO OUTFILE'));
        });

        it('POST /api/sql/execute strictly rejects dangerous execution functions with 403 Forbidden', async () => {
            const sleepSql = 'SELECT SLEEP(5)';
            const res = await fetch(`${baseUrl}/api/sql/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ sql: sleepSql })
            });

            const data = await res.json() as any;
            assert.equal(res.status, 403);
            assert.ok(data.error.includes('SLEEP'));
        });

        it('POST /api/sql/execute strictly rejects unauthenticated caller with 401 Unauthorized', async () => {
            const res = await fetch(`${baseUrl}/api/sql/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: 'SELECT 1' })
            });

            assert.equal(res.status, 401);
        });
    });
});
