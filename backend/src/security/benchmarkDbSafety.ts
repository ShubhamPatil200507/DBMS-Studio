export interface BenchmarkDbConfig {
    host: string;
    port: number;
    user: string;
    password?: string;
    database: string;
}

export interface BenchmarkSafetyValidationResult {
    isValid: boolean;
    error?: string;
    config?: BenchmarkDbConfig;
}

export const PROTECTED_SYSTEM_DATABASES = new Set(['mysql', 'information_schema', 'performance_schema', 'sys']);
export const SAFE_DB_NAME_REGEX = /^[a-zA-Z0-9_]{3,64}$/;

/**
 * Validates benchmark database configuration against application database and security boundaries.
 * 
 * Safety invariants enforced:
 * 1. BENCHMARK_DB_NAME must be explicitly specified (non-empty).
 * 2. BENCHMARK_DB_NAME must match valid identifier pattern: ^[a-zA-Z0-9_]{3,64}$.
 * 3. BENCHMARK_DB_NAME must NOT equal the configured application database name (DB_NAME).
 * 4. BENCHMARK_DB_NAME must NOT be a MySQL system database (mysql, sys, performance_schema, information_schema).
 * 5. BENCHMARK_DB_NAME must contain an explicit disposable/benchmark indicator ('benchmark', 'test', or 'synth').
 * 6. Explicit dedicated benchmark credentials required: silent fallback to application credentials or root/empty password is prohibited.
 */
export function validateBenchmarkDbConfig(env: NodeJS.ProcessEnv = process.env): BenchmarkSafetyValidationResult {
    const rawBenchDbName = env.BENCHMARK_DB_NAME?.trim();
    const rawAppDbName = (env.DB_NAME?.trim() || 'dbms_studio').toLowerCase();

    if (!rawBenchDbName) {
        return {
            isValid: false,
            error: 'Configuration Error: BENCHMARK_DB_NAME environment variable is required. Refusing to run live benchmark without explicit disposable database name.'
        };
    }

    if (!SAFE_DB_NAME_REGEX.test(rawBenchDbName)) {
        return {
            isValid: false,
            error: `Safety Exception: Invalid benchmark database name '${rawBenchDbName}'. Must be alphanumeric identifier between 3 and 64 characters without special symbols or spaces.`
        };
    }

    const lowerBenchName = rawBenchDbName.toLowerCase();

    if (PROTECTED_SYSTEM_DATABASES.has(lowerBenchName)) {
        return {
            isValid: false,
            error: `Safety Exception: Benchmark database name cannot be a protected MySQL system database ('${rawBenchDbName}').`
        };
    }

    if (lowerBenchName === rawAppDbName) {
        return {
            isValid: false,
            error: `Safety Exception: BENCHMARK_DB_NAME ('${rawBenchDbName}') cannot be identical to application database name ('${rawAppDbName}'). Application database protection violation.`
        };
    }

    if (!lowerBenchName.includes('benchmark') && !lowerBenchName.includes('test') && !lowerBenchName.includes('synth')) {
        return {
            isValid: false,
            error: `Safety Exception: BENCHMARK_DB_NAME ('${rawBenchDbName}') must explicitly indicate a disposable benchmark purpose (must contain 'benchmark', 'test', or 'synth').`
        };
    }

    // Benchmark database credentials:
    // Requires dedicated benchmark credentials by default; silent fallback to application DB credentials is prohibited.
    const user = env.BENCHMARK_DB_USER?.trim();
    if (!user) {
        return {
            isValid: false,
            error: 'Safety Exception: Dedicated benchmark credentials required. BENCHMARK_DB_USER environment variable must be explicitly configured; silent fallback to application database credentials is prohibited.'
        };
    }

    const password = env.BENCHMARK_DB_PASSWORD;
    if (password === undefined) {
        return {
            isValid: false,
            error: 'Safety Exception: Dedicated benchmark credentials required. BENCHMARK_DB_PASSWORD environment variable must be explicitly configured.'
        };
    }

    const host = env.BENCHMARK_DB_HOST?.trim() || 'localhost';
    const port = parseInt(env.BENCHMARK_DB_PORT || '3306', 10);

    return {
        isValid: true,
        config: {
            host,
            port,
            user,
            password,
            database: rawBenchDbName
        }
    };
}

/**
 * Generates a unique, non-colliding disposable benchmark database name for this specific execution run.
 */
export function generateUniqueBenchmarkDbName(baseName: string): string {
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const candidate = `${baseName}_${timestamp}_${randomSuffix}`;
    // Clamp to MySQL max identifier length of 64 chars
    return candidate.substring(0, 64);
}

/**
 * Checks whether a database already exists on the database server.
 */
export async function checkDatabasePreExists(connection: any, dbName: string): Promise<boolean> {
    if (!connection || !dbName) return false;
    const [rows] = await connection.query('SHOW DATABASES LIKE ?', [dbName]);
    return Array.isArray(rows) && rows.length > 0;
}

/**
 * Validates that a cleanup target DROP DATABASE statement strictly matches the validated disposable benchmark database
 * AND proves that this exact run created it. Pre-existing databases are strictly protected from accidental deletion.
 */
export function validateBenchmarkCleanupBoundary(
    targetDb: string,
    validatedBenchDb: string,
    createdByThisRun: boolean = true
): { isSafe: boolean; error?: string } {
    if (!targetDb || !validatedBenchDb) {
        return { isSafe: false, error: 'Database names cannot be empty during cleanup boundary verification.' };
    }

    if (!createdByThisRun) {
        return {
            isSafe: false,
            error: `Boundary Exception: Cleanup blocked because database '${targetDb}' was not confirmed as created by this specific benchmark run.`
        };
    }

    const t = targetDb.trim().toLowerCase();
    const v = validatedBenchDb.trim().toLowerCase();

    if (t !== v) {
        return { isSafe: false, error: `Boundary Exception: Target database '${targetDb}' does not match validated benchmark database '${validatedBenchDb}'. DROP operation blocked.` };
    }
    if (PROTECTED_SYSTEM_DATABASES.has(t)) {
        return { isSafe: false, error: `Boundary Exception: Target database '${targetDb}' is a protected MySQL system database. DROP operation blocked.` };
    }
    if (!t.includes('benchmark') && !t.includes('test') && !t.includes('synth')) {
        return { isSafe: false, error: `Boundary Exception: Target database '${targetDb}' does not carry disposable benchmark naming convention. DROP operation blocked.` };
    }

    return { isSafe: true };
}
