import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateBenchmarkDbConfig,
    validateBenchmarkCleanupBoundary,
    generateUniqueBenchmarkDbName,
    checkDatabasePreExists,
    executeBenchmarkCleanup,
    BenchmarkCleanupSession
} from '../../src/security/benchmarkDbSafety';

describe('Benchmark Database Safety & Boundary Verification Unit Tests', () => {
    const validBaseEnv: NodeJS.ProcessEnv = {
        DB_NAME: 'dbms_studio',
        DB_USER: 'app_user',
        DB_PASSWORD: 'secure_password_123',
        BENCHMARK_DB_NAME: 'dbms_studio_benchmark',
        BENCHMARK_DB_USER: 'dedicated_bench_user',
        BENCHMARK_DB_PASSWORD: 'dedicated_bench_password_456'
    };

    it('rejects execution when BENCHMARK_DB_NAME is completely missing', () => {
        const env = { ...validBaseEnv };
        delete env.BENCHMARK_DB_NAME;

        const result = validateBenchmarkDbConfig(env);
        assert.equal(result.isValid, false);
        assert.ok(result.error?.includes('BENCHMARK_DB_NAME environment variable is required'));
    });

    it('rejects execution when BENCHMARK_DB_NAME is identical to the application DB_NAME', () => {
        const env = {
            ...validBaseEnv,
            BENCHMARK_DB_NAME: 'dbms_studio',
            DB_NAME: 'dbms_studio'
        };

        const result = validateBenchmarkDbConfig(env);
        assert.equal(result.isValid, false);
        assert.ok(result.error?.includes('cannot be identical to application database name'));
    });

    it('rejects MySQL protected system databases as benchmark target', () => {
        for (const sysDb of ['mysql', 'information_schema', 'performance_schema', 'sys']) {
            const env = {
                ...validBaseEnv,
                BENCHMARK_DB_NAME: sysDb
            };

            const result = validateBenchmarkDbConfig(env);
            assert.equal(result.isValid, false);
            assert.ok(result.error?.includes('protected MySQL system database'));
        }
    });

    it('rejects invalid database identifiers with special characters, spaces, or injection tokens', () => {
        const invalidNames = [
            'bench db',
            'bench;DROP DATABASE dbms_studio;',
            'bench/db',
            'bench@123',
            'b', // too short (<3 chars)
            'a'.repeat(65) // too long (>64 chars)
        ];

        for (const name of invalidNames) {
            const env = {
                ...validBaseEnv,
                BENCHMARK_DB_NAME: name
            };

            const result = validateBenchmarkDbConfig(env);
            assert.equal(result.isValid, false);
            assert.ok(result.error?.includes('Invalid benchmark database name'));
        }
    });

    it('rejects database names without disposable benchmark indicator', () => {
        const nonDisposableEnv = {
            ...validBaseEnv,
            BENCHMARK_DB_NAME: 'customer_accounts_live'
        };

        const result = validateBenchmarkDbConfig(nonDisposableEnv);
        assert.equal(result.isValid, false);
        assert.ok(result.error?.includes('must explicitly indicate a disposable benchmark purpose'));
    });

    it('requires dedicated benchmark credentials and refuses silent fallback to application user', () => {
        const env = {
            ...validBaseEnv,
            DB_USER: 'app_user',
            DB_PASSWORD: 'app_password'
        };
        delete env.BENCHMARK_DB_USER;

        const result = validateBenchmarkDbConfig(env);
        assert.equal(result.isValid, false);
        assert.ok(result.error?.includes('BENCHMARK_DB_USER environment variable must be explicitly configured'));
    });

    it('requires dedicated benchmark password and refuses silent fallback to application password', () => {
        const env = {
            ...validBaseEnv,
            DB_USER: 'app_user',
            DB_PASSWORD: 'app_password'
        };
        delete env.BENCHMARK_DB_PASSWORD;

        const result = validateBenchmarkDbConfig(env);
        assert.equal(result.isValid, false);
        assert.ok(result.error?.includes('BENCHMARK_DB_PASSWORD environment variable must be explicitly configured'));
    });

    it('accepts valid configuration with dedicated benchmark credentials', () => {
        const dedicatedEnv = {
            ...validBaseEnv,
            BENCHMARK_DB_USER: 'bench_runner',
            BENCHMARK_DB_PASSWORD: 'bench_password_secret',
            BENCHMARK_DB_HOST: '127.0.0.1',
            BENCHMARK_DB_PORT: '3307'
        };

        const result = validateBenchmarkDbConfig(dedicatedEnv);
        assert.equal(result.isValid, true);
        assert.equal(result.config?.user, 'bench_runner');
        assert.equal(result.config?.password, 'bench_password_secret');
        assert.equal(result.config?.host, '127.0.0.1');
        assert.equal(result.config?.port, 3307);
        assert.equal(result.config?.database, 'dbms_studio_benchmark');
    });

    it('generates unique run-specific benchmark database names', () => {
        const name1 = generateUniqueBenchmarkDbName('dbms_studio_benchmark');
        const name2 = generateUniqueBenchmarkDbName('dbms_studio_benchmark');

        assert.notEqual(name1, name2);
        assert.ok(name1.startsWith('dbms_studio_benchmark_'));
        assert.ok(name1.length <= 64);
    });

    describe('Hardened Benchmark Cleanup Regression Suite', () => {
        // Regression Test 1: createdByThisRun omitted
        it('regression: blocks cleanup when createdByThisRun is omitted (undefined) - fails closed', () => {
            const boundary = validateBenchmarkCleanupBoundary(
                'dbms_studio_benchmark_test1',
                'dbms_studio_benchmark_test1',
                undefined as any
            );
            assert.equal(boundary.isSafe, false);
            assert.ok(boundary.error?.includes('ownership verification is missing, false, or invalid'));
        });

        // Regression Test 2: createdByThisRun = false
        it('regression: blocks cleanup when createdByThisRun is explicitly false - fails closed', () => {
            const boundary = validateBenchmarkCleanupBoundary(
                'dbms_studio_benchmark_test2',
                'dbms_studio_benchmark_test2',
                false
            );
            assert.equal(boundary.isSafe, false);
            assert.ok(boundary.error?.includes('ownership verification is missing, false, or invalid'));
        });

        // Regression Test 3: Pre-existing database
        it('regression: detects pre-existing database and refuses to overwrite or drop it', async () => {
            const mockConn = {
                query: async (sql: string, params: any[]) => {
                    if (sql.includes('SHOW DATABASES LIKE')) {
                        return [[{ Database: 'dbms_studio_benchmark_preexisting' }]];
                    }
                    throw new Error('Unexpected query execution on pre-existing database');
                }
            };

            const preExists = await checkDatabasePreExists(mockConn, 'dbms_studio_benchmark_preexisting');
            assert.equal(preExists, true);

            // Because database pre-existed, session ownership is false; cleanup must fail closed
            const boundary = validateBenchmarkCleanupBoundary(
                'dbms_studio_benchmark_preexisting',
                'dbms_studio_benchmark_preexisting',
                false
            );
            assert.equal(boundary.isSafe, false);
            assert.ok(boundary.error?.includes('ownership verification is missing, false, or invalid'));
        });

        // Regression Test 4: Database creation failure
        it('regression: blocks cleanup after database creation failure (ownership remains false)', async () => {
            const session: BenchmarkCleanupSession = {
                databaseName: 'dbms_studio_benchmark_failed_run',
                createdByThisRun: false,
                isCleanedUp: false
            };

            let dropAttempted = false;
            const mockConn = {
                query: async (sql: string) => {
                    if (sql.includes('DROP DATABASE')) dropAttempted = true;
                    return [[]];
                }
            };

            const result = await executeBenchmarkCleanup(mockConn, session);
            assert.equal(result.success, false);
            assert.equal(result.dropped, false);
            assert.equal(dropAttempted, false, 'DROP DATABASE must not be executed when creation failed');
            assert.ok(result.error?.includes('ownership verification is missing, false, or invalid'));
        });

        // Regression Test 5: Successful creation followed by cleanup
        it('regression: allows cleanup following successful creation and drops target database', async () => {
            const session: BenchmarkCleanupSession = {
                databaseName: 'dbms_studio_benchmark_successful_run',
                createdByThisRun: true,
                isCleanedUp: false
            };

            const executedSql: string[] = [];
            const mockConn = {
                query: async (sql: string) => {
                    executedSql.push(sql);
                    return [[]];
                }
            };

            const result = await executeBenchmarkCleanup(mockConn, session);
            assert.equal(result.success, true);
            assert.equal(result.dropped, true);
            assert.equal(session.isCleanedUp, true);
            assert.ok(executedSql.some(s => s.includes('DROP DATABASE IF EXISTS `dbms_studio_benchmark_successful_run`')));
        });

        // Regression Test 6: Cleanup called twice
        it('regression: blocks duplicate drop when cleanup is called twice on the same session', async () => {
            const session: BenchmarkCleanupSession = {
                databaseName: 'dbms_studio_benchmark_double_run',
                createdByThisRun: true,
                isCleanedUp: false
            };

            let dropInvocationCount = 0;
            const mockConn = {
                query: async (sql: string) => {
                    if (sql.includes('DROP DATABASE')) dropInvocationCount++;
                    return [[]];
                }
            };

            // First cleanup call: succeeds
            const res1 = await executeBenchmarkCleanup(mockConn, session);
            assert.equal(res1.success, true);
            assert.equal(res1.dropped, true);
            assert.equal(dropInvocationCount, 1);
            assert.equal(session.isCleanedUp, true);

            // Second cleanup call: MUST fail closed
            const res2 = await executeBenchmarkCleanup(mockConn, session);
            assert.equal(res2.success, false);
            assert.equal(res2.dropped, false);
            assert.equal(dropInvocationCount, 1, 'DROP DATABASE must not be called twice');
            assert.ok(res2.error?.includes('already been executed'));
        });
    });

    describe('Cleanup Boundary Verification Target Mismatch & Protection', () => {
        it('strictly blocks cleanup when target database differs from validated database', () => {
            const boundary = validateBenchmarkCleanupBoundary(
                'dbms_studio',
                'dbms_studio_benchmark',
                true
            );
            assert.equal(boundary.isSafe, false);
            assert.ok(boundary.error?.includes('does not match validated benchmark database'));
        });

        it('strictly blocks cleanup if target database is a protected system database', () => {
            const boundary = validateBenchmarkCleanupBoundary('mysql', 'mysql', true);
            assert.equal(boundary.isSafe, false);
            assert.ok(boundary.error?.includes('protected MySQL system database'));
        });
    });
});
