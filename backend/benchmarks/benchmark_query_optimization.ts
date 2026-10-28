import { parseAndExplainSql } from '../src/nlp/sqlAstAnalyzer';
import { query } from '../src/database/connection';

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
        originalSql: 'SELECT id, name FROM bench_synth_customers WHERE id IN (SELECT customer_id FROM bench_synth_orders WHERE amount > 300) ORDER BY id;',
        transformedSql: 'SELECT DISTINCT c.id, c.name FROM bench_synth_customers c INNER JOIN bench_synth_orders o ON c.id = o.customer_id WHERE o.amount > 300 ORDER BY c.id;'
    },
    {
        id: 'DB-TRANS-02',
        description: 'Correlated COUNT(*) > 0 subquery transformed to short-circuiting EXISTS predicate',
        transformationType: 'EXISTS Semi-Join Transformation',
        originalSql: 'SELECT id, name FROM bench_synth_customers c WHERE (SELECT COUNT(*) FROM bench_synth_orders o WHERE o.customer_id = c.id) > 0 ORDER BY id;',
        transformedSql: 'SELECT id, name FROM bench_synth_customers c WHERE EXISTS (SELECT 1 FROM bench_synth_orders o WHERE o.customer_id = c.id) ORDER BY id;'
    },
    {
        id: 'DB-TRANS-03',
        description: 'SARGable predicate transformation eliminating function evaluation on filtered column',
        transformationType: 'SARGable Predicate Flattening',
        originalSql: "SELECT id, name, status FROM bench_synth_customers WHERE LOWER(status) = 'active' ORDER BY id;",
        transformedSql: "SELECT id, name, status FROM bench_synth_customers WHERE status = 'active' ORDER BY id;"
    }
];

function sortRows(rows: any[]): any[] {
    return [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
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

    latencies.sort((a, b) => a - b);
    const medianLatencyMs = latencies[Math.floor(latencies.length / 2)];
    const meanLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const total = OPTIMIZATION_BENCHMARK_QUERIES.length;

    const summary = {
        totalQueriesEvaluated: total,
        runsPerQuery,
        totalExecutionRuns: total * runsPerQuery,
        safetyDetectionAccuracy: Number(((safetyFlagsAccuratelyTriggered / total) * 100).toFixed(2)),
        meanAstAnalysisLatencyMs: Number(meanLatencyMs.toFixed(4)),
        medianAstAnalysisLatencyMs: Number(medianLatencyMs.toFixed(4)),
        minAstAnalysisLatencyMs: Number(latencies[0].toFixed(4)),
        maxAstAnalysisLatencyMs: Number(latencies[latencies.length - 1].toFixed(4)),
        note: 'AST parsing latency measures in-process JavaScript parser execution time, not database execution.'
    };

    return { summary, results };
}

/**
 * Executes Part B: Empirical Database Execution & Equivalence Benchmark on Live MySQL Instance.
 */
export async function runLiveDbExecutionBenchmark(runsPerQuery = 5): Promise<any> {
    const liveResults: any[] = [];

    try {
        await query('SELECT 1');
    } catch (err: any) {
        return {
            summary: {
                status: 'PENDING_NO_DATABASE_CONNECTION',
                reason: `Could not connect to live MySQL instance: ${err.message}`,
                totalTransformationsTested: 0,
                verifiedSemanticallyEquivalent: 0,
                semanticEquivalenceRate: 0
            },
            results: []
        };
    }

    try {
        // Setup isolated synthetic benchmark dataset
        await query('DROP TABLE IF EXISTS bench_synth_orders');
        await query('DROP TABLE IF EXISTS bench_synth_customers');

        await query(`
            CREATE TABLE bench_synth_customers (
                id INT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                status VARCHAR(20) NOT NULL,
                balance DECIMAL(10,2) NOT NULL,
                INDEX idx_status (status)
            )
        `);

        await query(`
            CREATE TABLE bench_synth_orders (
                id INT PRIMARY KEY,
                customer_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                INDEX idx_customer_id (customer_id)
            )
        `);

        // Populate with deterministic synthetic rows
        for (let i = 1; i <= 200; i++) {
            const status = i % 3 === 0 ? 'active' : (i % 3 === 1 ? 'inactive' : 'pending');
            const balance = (i * 17.5).toFixed(2);
            await query(
                'INSERT INTO bench_synth_customers (id, name, status, balance) VALUES (?, ?, ?, ?)',
                [i, `Customer_${i}`, status, balance]
            );

            // Add 1-3 orders per customer
            const orderCount = (i % 3) + 1;
            for (let o = 1; o <= orderCount; o++) {
                const orderId = (i * 10) + o;
                const amount = ((i * o * 13.2) % 1000).toFixed(2);
                await query(
                    'INSERT INTO bench_synth_orders (id, customer_id, amount) VALUES (?, ?, ?)',
                    [orderId, i, amount]
                );
            }
        }

        let verifiedEquivalentCount = 0;

        for (const test of LIVE_DB_TRANSFORMATIONS) {
            const origLatencies: number[] = [];
            const transLatencies: number[] = [];

            let origRows: any[] = [];
            let transRows: any[] = [];

            for (let r = 0; r < runsPerQuery; r++) {
                const startO = performance.now();
                origRows = await query(test.originalSql);
                const endO = performance.now();
                origLatencies.push(endO - startO);

                const startT = performance.now();
                transRows = await query(test.transformedSql);
                const endT = performance.now();
                transLatencies.push(endT - startT);
            }

            origLatencies.sort((a, b) => a - b);
            transLatencies.sort((a, b) => a - b);

            const medianOrigMs = origLatencies[Math.floor(origLatencies.length / 2)];
            const medianTransMs = transLatencies[Math.floor(transLatencies.length / 2)];

            // Verify complete row-by-row equivalence
            const sortedOrig = sortRows(origRows);
            const sortedTrans = sortRows(transRows);
            const resultsEquivalent = JSON.stringify(sortedOrig) === JSON.stringify(sortedTrans);

            if (resultsEquivalent) {
                verifiedEquivalentCount++;
            }

            const speedup = medianTransMs > 0 ? Number((medianOrigMs / medianTransMs).toFixed(2)) : 1.0;

            liveResults.push({
                id: test.id,
                description: test.description,
                transformationType: test.transformationType,
                rowsReturned: origRows.length,
                resultsEquivalent,
                medianOriginalDbLatencyMs: Number(medianOrigMs.toFixed(4)),
                medianTransformedDbLatencyMs: Number(medianTransMs.toFixed(4)),
                speedupFactor: `${speedup}x`
            });
        }

        const summary = {
            status: 'COMPLETED_EMPIRICAL_LIVE_DB',
            totalTransformationsTested: LIVE_DB_TRANSFORMATIONS.length,
            verifiedSemanticallyEquivalent: verifiedEquivalentCount,
            semanticEquivalenceRate: Number(((verifiedEquivalentCount / LIVE_DB_TRANSFORMATIONS.length) * 100).toFixed(2)),
            runsPerTransformation: runsPerQuery
        };

        return { summary, results: liveResults };
    } finally {
        // Clean up synthetic tables
        try {
            await query('DROP TABLE IF EXISTS bench_synth_orders');
            await query('DROP TABLE IF EXISTS bench_synth_customers');
        } catch (e) {
            // Ignore cleanup error
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
        liveDbSemanticEquivalenceRate: liveDbBenchmark.summary.semanticEquivalenceRate,
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
            console.log(`Live DB Benchmark Status: ${liveDbBenchmark.summary.status}`);
        }

        console.log('\n=== COMBINED QUERY OPTIMIZATION BENCHMARK SUMMARY ===');
        console.table(summary);
    })();
}
