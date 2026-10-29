import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';
import { parseAndExplainSql } from '../src/nlp/sqlAstAnalyzer';
import { validateBenchmarkDbConfig, validateBenchmarkCleanupBoundary } from '../src/security/benchmarkDbSafety';

export interface OptimizationBenchmarkItem {
    id: string;
    description: string;
    originalSql: string;
    expectedASTConcern?: string;
    expectedIndexRecommendationTable?: string;
}

export interface LiveDbTransformationTest {
    id: string;
    description: string;
    transformationType: string;
    collationMode: 'CASE_INSENSITIVE' | 'CASE_SENSITIVE';
    expectedSemanticallyEquivalent: boolean;
    originalSql: string;
    transformedSql: string;
}

export const OPTIMIZATION_BENCHMARK_QUERIES: OptimizationBenchmarkItem[] = [
    {
        id: 'OPT-01',
        description: 'Unindexed Wildcard SELECT on users table',
        originalSql: 'SELECT * FROM users WHERE email = "alice@example.com";',
        expectedASTConcern: 'PERFORMANCE',
        expectedIndexRecommendationTable: 'users'
    },
    {
        id: 'OPT-02',
        description: 'Two-table inner join without explicit projection',
        originalSql: 'SELECT * FROM orders o JOIN users u ON o.user_id = u.id WHERE o.total_amount > 500;',
        expectedASTConcern: 'PERFORMANCE',
        expectedIndexRecommendationTable: 'orders'
    },
    {
        id: 'OPT-03',
        description: 'Aggregation with GROUP BY and HAVING without index order',
        originalSql: 'SELECT user_id, COUNT(*) as order_count, SUM(total_amount) as total_spent FROM orders GROUP BY user_id HAVING COUNT(*) > 3;',
        expectedASTConcern: undefined
    },
    {
        id: 'OPT-04',
        description: 'Unbounded delete query (critical safety concern)',
        originalSql: 'DELETE FROM session_logs;',
        expectedASTConcern: 'CRITICAL',
        expectedIndexRecommendationTable: 'session_logs'
    },
    {
        id: 'OPT-05',
        description: 'Query with unindexed ORDER BY filesort pattern',
        originalSql: 'SELECT id, total_amount, created_at FROM orders WHERE status = "COMPLETED" ORDER BY created_at DESC LIMIT 20;',
        expectedASTConcern: undefined
    },
    {
        id: 'OPT-06',
        description: 'Three-table join with selective filtering',
        originalSql: 'SELECT u.name, o.id, oi.product_name FROM users u JOIN orders o ON u.id = o.user_id JOIN order_items oi ON o.id = oi.order_id WHERE oi.price > 50;',
        expectedASTConcern: undefined
    },
    {
        id: 'OPT-07',
        description: 'SELECT wildcard with subquery in FROM clause',
        originalSql: 'SELECT * FROM (SELECT user_id, COUNT(*) as cnt FROM reviews GROUP BY user_id) as user_reviews WHERE cnt > 5;',
        expectedASTConcern: 'PERFORMANCE'
    },
    {
        id: 'OPT-08',
        description: 'Unbounded UPDATE statement without WHERE clause',
        originalSql: 'UPDATE products SET stock_quantity = 0;',
        expectedASTConcern: 'CRITICAL'
    },
    {
        id: 'OPT-09',
        description: 'Specific projection with indexable primary key range scan',
        originalSql: 'SELECT id, email FROM users WHERE id BETWEEN 100 AND 200 ORDER BY id ASC;',
        expectedASTConcern: undefined
    },
    {
        id: 'OPT-10',
        description: 'Paginated query with explicit LIMIT and OFFSET boundary',
        originalSql: 'SELECT id, name, created_at FROM users ORDER BY created_at DESC LIMIT 50;',
        expectedASTConcern: undefined
    }
];

export const LIVE_DB_TRANSFORMATIONS: LiveDbTransformationTest[] = [
    {
        id: 'DB-TRANS-01',
        description: 'Correlated subquery IN unnested to INNER JOIN with DISTINCT',
        transformationType: 'Subquery Unnesting',
        collationMode: 'CASE_INSENSITIVE',
        expectedSemanticallyEquivalent: true,
        originalSql: 'SELECT id, name FROM bench_synth_customers WHERE id IN (SELECT customer_id FROM bench_synth_orders WHERE amount > 300) ORDER BY id;',
        transformedSql: 'SELECT DISTINCT c.id, c.name FROM bench_synth_customers c INNER JOIN bench_synth_orders o ON c.id = o.customer_id WHERE o.amount > 300 ORDER BY c.id;'
    },
    {
        id: 'DB-TRANS-02',
        description: 'Correlated COUNT(*) > 0 subquery transformed to short-circuiting EXISTS predicate',
        transformationType: 'EXISTS Semi-Join Transformation',
        collationMode: 'CASE_INSENSITIVE',
        expectedSemanticallyEquivalent: true,
        originalSql: 'SELECT id, name FROM bench_synth_customers c WHERE (SELECT COUNT(*) FROM bench_synth_orders o WHERE o.customer_id = c.id) > 0 ORDER BY id;',
        transformedSql: 'SELECT id, name FROM bench_synth_customers c WHERE EXISTS (SELECT 1 FROM bench_synth_orders o WHERE o.customer_id = c.id) ORDER BY id;'
    },
    {
        id: 'DB-TRANS-03-CI',
        description: 'SARGable predicate flattening on case-insensitive collation column (utf8mb4_general_ci)',
        transformationType: 'SARGable Predicate Flattening (CI)',
        collationMode: 'CASE_INSENSITIVE',
        expectedSemanticallyEquivalent: true,
        originalSql: "SELECT id, name, status_ci FROM bench_synth_customers WHERE LOWER(status_ci) = 'active' ORDER BY id;",
        transformedSql: "SELECT id, name, status_ci FROM bench_synth_customers WHERE status_ci = 'active' ORDER BY id;"
    },
    {
        id: 'DB-TRANS-03-CS',
        description: 'SARGable predicate rewrite guard check on binary case-sensitive collation column (utf8mb4_bin)',
        transformationType: 'Collation-Sensitive Rewrite Guard',
        collationMode: 'CASE_SENSITIVE',
        expectedSemanticallyEquivalent: false, // Rewrite is UNTRUE / UNSAFE on mixed-case data under case-sensitive collation!
        originalSql: "SELECT id, name, status_cs FROM bench_synth_customers WHERE LOWER(status_cs) = 'active' ORDER BY id;",
        transformedSql: "SELECT id, name, status_cs FROM bench_synth_customers WHERE status_cs = 'active' ORDER BY id;"
    }
];

function sortRows(rows: any[]): any[] {
    return [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function computeStats(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
    const min = sorted[0];
    const max = sorted[n - 1];
    const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    return {
        median: Number(median.toFixed(4)),
        mean: Number(mean.toFixed(4)),
        min: Number(min.toFixed(4)),
        max: Number(max.toFixed(4)),
        stdDev: Number(stdDev.toFixed(4))
    };
}

/**
 * Executes Part A: AST Structural Analysis Benchmark (Local In-Memory AST Parsing).
 */
export function runAstAnalysisBenchmark(runsPerQuery = 5) {
    const results: any[] = [];
    const latencies: number[] = [];
    let safetyFlagsAccuratelyTriggered = 0;

    for (const item of OPTIMIZATION_BENCHMARK_QUERIES) {
        const itemLatencies: number[] = [];
        let lastAnalysis: any = null;

        for (let r = 0; r < runsPerQuery; r++) {
            const start = performance.now();
            const analysis = parseAndExplainSql(item.originalSql);
            const end = performance.now();
            const lat = end - start;
            itemLatencies.push(lat);
            latencies.push(lat);
            lastAnalysis = analysis;
        }

        itemLatencies.sort((a, b) => a - b);
        const medianItemLatency = itemLatencies[Math.floor(itemLatencies.length / 2)];

        const hasExpectedConcern = item.expectedASTConcern
            ? lastAnalysis.concerns.some((c: string) => c.includes(item.expectedASTConcern!))
            : true;

        if (hasExpectedConcern) safetyFlagsAccuratelyTriggered++;

        results.push({
            id: item.id,
            description: item.description,
            syntaxValid: lastAnalysis.syntaxValid,
            tablesAccessed: lastAnalysis.tablesAccessed.join(', '),
            columnsReferenced: lastAnalysis.columnsReferenced.join(', '),
            hasAggregate: lastAnalysis.hasAggregate,
            isDestructive: lastAnalysis.isDestructive,
            concernsCount: lastAnalysis.concerns.length,
            concerns: lastAnalysis.concerns.join('; '),
            astAnalysisLatencyMs: Number(medianItemLatency.toFixed(4))
        });
    }

    const stats = computeStats(latencies);
    const total = OPTIMIZATION_BENCHMARK_QUERIES.length;

    const summary = {
        totalQueriesEvaluated: total,
        runsPerQuery,
        totalExecutionRuns: total * runsPerQuery,
        safetyDetectionAccuracy: Number(((safetyFlagsAccuratelyTriggered / total) * 100).toFixed(2)),
        meanAstAnalysisLatencyMs: stats.mean,
        medianAstAnalysisLatencyMs: stats.median,
        minAstAnalysisLatencyMs: stats.min,
        maxAstAnalysisLatencyMs: stats.max,
        stdDevAstAnalysisLatencyMs: stats.stdDev,
        note: 'AST parsing latency measures in-process JavaScript parser execution time, not database execution.'
    };

    return { summary, results };
}

/**
 * Executes Part B: Empirical Database Execution & Equivalence Benchmark.
 * STRICT SAFETY RULE: Never mutates the application database. Operates exclusively within
 * an isolated, dedicated disposable benchmark database (e.g. 'dbms_studio_benchmark').
 */
export async function runLiveDbExecutionBenchmark(runsPerQuery = 5): Promise<any> {
    const liveResults: any[] = [];
    const validation = validateBenchmarkDbConfig(process.env);

    if (!validation.isValid || !validation.config) {
        return {
            summary: {
                status: 'PENDING_ISOLATED_BENCHMARK_DB_CONFIG_INVALID',
                reason: validation.error || 'Invalid benchmark database configuration. Application database protected.',
                totalTransformationsTested: 0,
                verifiedSemanticallyEquivalent: 0,
                equivalenceBehaviorRate: 0
            },
            results: []
        };
    }

    const benchDbConfig = validation.config;
    const benchDbName = benchDbConfig.database;

    let connection: mysql.Connection | null = null;
    let mysqlVersion = 'Unknown';

    try {
        // Attempt connection using validated explicit benchmark credentials
        connection = await mysql.createConnection({
            host: benchDbConfig.host,
            port: benchDbConfig.port,
            user: benchDbConfig.user,
            password: benchDbConfig.password
        });

        // Retrieve live MySQL engine version
        const [versionRows] = await connection.query('SELECT VERSION() AS version');
        mysqlVersion = (versionRows as any)[0]?.version || 'Unknown';

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${benchDbName}\`;`);
        await connection.query(`USE \`${benchDbName}\`;`);
    } catch (err: any) {
        if (connection) {
            try { await connection.end(); } catch (e) { /* ignore */ }
        }
        return {
            summary: {
                status: 'PENDING_ISOLATED_BENCHMARK_DB_UNAVAILABLE',
                reason: `Could not establish isolated benchmark database '${benchDbName}': ${err.message}. Application database protected.`,
                totalTransformationsTested: 0,
                verifiedSemanticallyEquivalent: 0,
                equivalenceBehaviorRate: 0
            },
            results: []
        };
    }

    try {
        // Clean any existing benchmark-owned tables inside the isolated benchmark schema only
        await connection.query('DROP TABLE IF EXISTS bench_synth_orders');
        await connection.query('DROP TABLE IF EXISTS bench_synth_customers');

        // Create benchmark customers table with BOTH case-insensitive and case-sensitive collations
        await connection.query(`
            CREATE TABLE bench_synth_customers (
                id INT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                status_ci VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
                status_cs VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                balance DECIMAL(10,2) NOT NULL,
                INDEX idx_status_ci (status_ci),
                INDEX idx_status_cs (status_cs)
            ) ENGINE=InnoDB;
        `);

        await connection.query(`
            CREATE TABLE bench_synth_orders (
                id INT PRIMARY KEY,
                customer_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                INDEX idx_customer_id (customer_id)
            ) ENGINE=InnoDB;
        `);

        // Populate with deterministic synthetic rows with MIXED-CASE status values
        const mixedStatuses = ['active', 'Active', 'ACTIVE', 'inactive', 'Inactive', 'pending', 'PENDING'];
        const customerRows = 300;

        for (let i = 1; i <= customerRows; i++) {
            const rawStatus = mixedStatuses[i % mixedStatuses.length];
            const balance = (i * 12.75).toFixed(2);
            await connection.execute(
                'INSERT INTO bench_synth_customers (id, name, status_ci, status_cs, balance) VALUES (?, ?, ?, ?, ?)',
                [i, `Customer_${i}`, rawStatus, rawStatus, balance]
            );

            // Add 1-3 orders per customer
            const orderCount = (i % 3) + 1;
            for (let o = 1; o <= orderCount; o++) {
                const orderId = (i * 10) + o;
                const amount = ((i * o * 19.4) % 1000).toFixed(2);
                await connection.execute(
                    'INSERT INTO bench_synth_orders (id, customer_id, amount) VALUES (?, ?, ?)',
                    [orderId, i, amount]
                );
            }
        }

        let verifiedEquivalentCount = 0;

        for (const test of LIVE_DB_TRANSFORMATIONS) {
            // Warm-up procedure: 1 unmeasured execution per query to prime InnoDB buffer pool
            await connection.query(test.originalSql);
            await connection.query(test.transformedSql);

            const origLatencies: number[] = [];
            const transLatencies: number[] = [];

            let origRows: any[] = [];
            let transRows: any[] = [];

            for (let r = 0; r < runsPerQuery; r++) {
                const startO = performance.now();
                const [oRows] = await connection.query(test.originalSql);
                const endO = performance.now();
                origLatencies.push(endO - startO);
                origRows = oRows as any[];

                const startT = performance.now();
                const [tRows] = await connection.query(test.transformedSql);
                const endT = performance.now();
                transLatencies.push(endT - startT);
                transRows = tRows as any[];
            }

            const origStats = computeStats(origLatencies);
            const transStats = computeStats(transLatencies);

            // Verify complete row-by-row equivalence
            const sortedOrig = sortRows(origRows);
            const sortedTrans = sortRows(transRows);
            const resultsEquivalent = JSON.stringify(sortedOrig) === JSON.stringify(sortedTrans);

            if (resultsEquivalent === test.expectedSemanticallyEquivalent) {
                verifiedEquivalentCount++;
            }

            const speedup = transStats.median > 0 ? Number((origStats.median / transStats.median).toFixed(2)) : 1.0;

            liveResults.push({
                id: test.id,
                description: test.description,
                transformationType: test.transformationType,
                collationMode: test.collationMode,
                expectedEquivalence: test.expectedSemanticallyEquivalent,
                actualEquivalence: resultsEquivalent,
                rowsOriginal: origRows.length,
                rowsTransformed: transRows.length,
                medianOriginalDbLatencyMs: origStats.median,
                stdDevOriginalDbLatencyMs: origStats.stdDev,
                medianTransformedDbLatencyMs: transStats.median,
                stdDevTransformedDbLatencyMs: transStats.stdDev,
                speedupFactor: `${speedup}x`
            });
        }

        const summary = {
            status: 'COMPLETED_EMPIRICAL_LIVE_DB',
            benchmarkDatabase: benchDbName,
            mysqlVersion,
            warmupProcedure: '1 unmeasured execution per query to prime InnoDB buffer pool',
            repetitionsPerTransformation: runsPerQuery,
            datasetCustomers: customerRows,
            datasetOrders: customerRows * 2,
            collationsTested: ['utf8mb4_general_ci (Case-Insensitive)', 'utf8mb4_bin (Case-Sensitive Binary)'],
            equivalenceVerificationMethod: 'Deterministic row-by-row sorting and JSON canonicalization comparison',
            totalTransformationsTested: LIVE_DB_TRANSFORMATIONS.length,
            correctEquivalenceBehaviorCount: verifiedEquivalentCount,
            equivalenceBehaviorRate: Number(((verifiedEquivalentCount / LIVE_DB_TRANSFORMATIONS.length) * 100).toFixed(2)),
            collationNote: 'Includes mixed-case evaluation on case-insensitive (utf8mb4_general_ci) and binary case-sensitive (utf8mb4_bin) collations.'
        };

        return { summary, results: liveResults };
    } finally {
        // Clean up benchmark-owned schema completely with strict boundary verification
        if (connection) {
            try {
                await connection.query('DROP TABLE IF EXISTS bench_synth_orders');
                await connection.query('DROP TABLE IF EXISTS bench_synth_customers');

                const boundaryCheck = validateBenchmarkCleanupBoundary(benchDbName, benchDbConfig.database);
                if (boundaryCheck.isSafe) {
                    await connection.query(`DROP DATABASE IF EXISTS \`${benchDbConfig.database}\`;`);
                } else {
                    console.error('Safety Boundary Check Failed on Cleanup:', boundaryCheck.error);
                }
                await connection.end();
            } catch (e) {
                // Ignore cleanup error
            }
        }
    }
}

/**
 * Combined query optimization benchmark executing AST analysis and live DB benchmarking.
 */
export async function runQueryOptimizationBenchmark(runsPerQuery = 5) {
    const astBenchmark = runAstAnalysisBenchmark(runsPerQuery);
    const liveDbBenchmark = await runLiveDbExecutionBenchmark(runsPerQuery);

    const summary = {
        astQueriesEvaluated: astBenchmark.summary.totalQueriesEvaluated,
        astSafetyDetectionAccuracy: astBenchmark.summary.safetyDetectionAccuracy,
        medianAstAnalysisLatencyMs: astBenchmark.summary.medianAstAnalysisLatencyMs,
        liveDbStatus: liveDbBenchmark.summary.status,
        liveDbTransformationsTested: liveDbBenchmark.summary.totalTransformationsTested,
        liveDbEquivalenceRate: liveDbBenchmark.summary.equivalenceBehaviorRate,
        runsPerQuery
    };

    return {
        summary,
        astBenchmark,
        liveDbBenchmark,
        results: astBenchmark.results
    };
}

if (require.main === module) {
    (async () => {
        const { summary, astBenchmark, liveDbBenchmark } = await runQueryOptimizationBenchmark();
        console.log('=== PART A: AST STRUCTURAL ANALYSIS BENCHMARK (LOCAL PARSER) ===');
        console.table(astBenchmark.summary);

        console.log('\n=== PART B: EMPIRICAL LIVE DATABASE REWRITE & EQUIVALENCE BENCHMARK ===');
        if (liveDbBenchmark.summary.status === 'COMPLETED_EMPIRICAL_LIVE_DB') {
            console.table(liveDbBenchmark.summary);
            console.table(liveDbBenchmark.results);
        } else {
            console.log(`Live DB Benchmark Status: ${liveDbBenchmark.summary.status} (${liveDbBenchmark.summary.reason})`);
        }

        console.log('\n=== COMBINED QUERY OPTIMIZATION BENCHMARK SUMMARY ===');
        console.table(summary);
    })();
}
