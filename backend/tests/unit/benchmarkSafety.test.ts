import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateBenchmarkDbConfig,
    validateBenchmarkCleanupBoundary,
    generateUniqueBenchmarkDbName,
    checkDatabasePreExists
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

    it('detects pre-existing database to prevent accidental overwrite or destruction', async () => {
        const mockConnPreExists = {
            query: async (sql: string, params: any[]) => {
                return [[{ Database: 'dbms_studio_benchmark' }]];
            }
        };

        const mockConnDoesNotExist = {
            query: async (sql: string, params: any[]) => {
                return [[]];
            }
        };

        assert.equal(await checkDatabasePreExists(mockConnPreExists, 'dbms_studio_benchmark'), true);
        assert.equal(await checkDatabasePreExists(mockConnDoesNotExist, 'dbms_studio_benchmark_unique'), false);
    });

    describe('Cleanup Boundary Verification & Pre-Existing Database Protection', () => {
        it('allows cleanup only when database was created by this specific run and names match', () => {
            const boundary = validateBenchmarkCleanupBoundary(
                'dbms_studio_benchmark_run123',
                'dbms_studio_benchmark_run123',
                true
            );
            assert.equal(boundary.isSafe, true);
        });

        it('strictly blocks cleanup when database was NOT confirmed as created by this run', () => {
            const boundary = validateBenchmarkCleanupBoundary(
                'dbms_studio_benchmark',
                'dbms_studio_benchmark',
                false
            );
            assert.equal(boundary.isSafe, false);
            assert.ok(boundary.error?.includes('was not confirmed as created by this specific benchmark run'));
        });

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
