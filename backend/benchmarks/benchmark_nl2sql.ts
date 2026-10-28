import { parseSchemaContext, buildQueryIR } from '../src/nlp/nluParser';

export interface NL2SQLTestCase {
    id: string;
    naturalLanguage: string;
    expectedTables: string[];
    expectedIntent: 'SELECT' | 'AGGREGATE' | 'INSERT' | 'UPDATE' | 'DELETE';
    expectedFeatures: string[];
    difficulty: 'SIMPLE' | 'MEDIUM' | 'COMPLEX';
}

const SAMPLE_SCHEMA_DDL = `
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

export const NL2SQL_BENCHMARK_CORPUS: NL2SQLTestCase[] = [
    {
        id: 'NL-01',
        naturalLanguage: 'Show all users',
        expectedTables: ['users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['SELECT'],
        difficulty: 'SIMPLE'
    },
    {
        id: 'NL-02',
        naturalLanguage: 'Count the total number of orders',
        expectedTables: ['orders'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['COUNT'],
        difficulty: 'SIMPLE'
    },
    {
        id: 'NL-03',
        naturalLanguage: 'Get the first 5 reviews',
        expectedTables: ['reviews'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['LIMIT'],
        difficulty: 'SIMPLE'
    },
    {
        id: 'NL-04',
        naturalLanguage: 'Show all order items sorted by price descending',
        expectedTables: ['order_items'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['ORDER_BY'],
        difficulty: 'SIMPLE'
    },
    {
        id: 'NL-05',
        naturalLanguage: 'List users with their corresponding orders',
        expectedTables: ['users', 'orders'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN'],
        difficulty: 'MEDIUM'
    },
    {
        id: 'NL-06',
        naturalLanguage: 'Find orders and the items purchased in each order',
        expectedTables: ['orders', 'order_items'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN'],
        difficulty: 'MEDIUM'
    },
    {
        id: 'NL-07',
        naturalLanguage: 'Show users who wrote reviews',
        expectedTables: ['users', 'reviews'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN'],
        difficulty: 'MEDIUM'
    },
    {
        id: 'NL-08',
        naturalLanguage: 'Retrieve users where email ends with example.com',
        expectedTables: ['users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['FILTER'],
        difficulty: 'MEDIUM'
    },
    {
        id: 'NL-09',
        naturalLanguage: 'Calculate the total revenue from orders',
        expectedTables: ['orders'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['SUM'],
        difficulty: 'MEDIUM'
    },
    {
        id: 'NL-10',
        naturalLanguage: 'Calculate the average rating across all reviews',
        expectedTables: ['reviews'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['AVG'],
        difficulty: 'MEDIUM'
    },
    {
        id: 'NL-11',
        naturalLanguage: 'Count the number of orders per user',
        expectedTables: ['users', 'orders'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['GROUP_BY', 'JOIN'],
        difficulty: 'COMPLEX'
    },
    {
        id: 'NL-12',
        naturalLanguage: 'Find top 3 users with the highest order volume',
        expectedTables: ['users', 'orders'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['LIMIT', 'ORDER_BY', 'JOIN'],
        difficulty: 'COMPLEX'
    },
    {
        id: 'NL-13',
        naturalLanguage: 'Display average product price per order item',
        expectedTables: ['order_items'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['AVG'],
        difficulty: 'COMPLEX'
    },
    {
        id: 'NL-14',
        naturalLanguage: 'List orders with total amounts exceeding 500 dollars',
        expectedTables: ['orders'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['FILTER'],
        difficulty: 'MEDIUM'
    },
    {
        id: 'NL-15',
        naturalLanguage: 'Find users with pending orders',
        expectedTables: ['users', 'orders'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN', 'FILTER'],
        difficulty: 'COMPLEX'
    },
    {
        id: 'NL-16',
        naturalLanguage: 'List reviews with 5 star ratings sorted by creation date',
        expectedTables: ['reviews'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['FILTER', 'ORDER_BY'],
        difficulty: 'MEDIUM'
    },
    {
        id: 'NL-17',
        naturalLanguage: 'Count distinct users who made at least one purchase',
        expectedTables: ['users', 'orders'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['COUNT', 'JOIN'],
        difficulty: 'COMPLEX'
    },
    {
        id: 'NL-18',
        naturalLanguage: 'Find maximum order amount in the orders database',
        expectedTables: ['orders'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['MAX'],
        difficulty: 'MEDIUM'
    },
    {
        id: 'NL-19',
        naturalLanguage: 'Show users registered recently ordered by id desc limit 10',
        expectedTables: ['users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['LIMIT', 'ORDER_BY'],
        difficulty: 'SIMPLE'
    },
    {
        id: 'NL-20',
        naturalLanguage: 'List users who gave 1 star reviews with their comments',
        expectedTables: ['users', 'reviews'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN', 'FILTER'],
        difficulty: 'COMPLEX'
    }
];

/**
 * Naive Baseline: Unstemmed, exact substring matching without schema relationship knowledge.
 */
function runNaiveBaseline(request: string): { tables: string[], intent: 'SELECT' | 'AGGREGATE', joinsIdentified: number } {
    const lower = request.toLowerCase();
    const candidateTables = ['users', 'orders', 'order_items', 'reviews'];
    const tables = candidateTables.filter(t => lower.includes(t));

    let intent: 'SELECT' | 'AGGREGATE' = 'SELECT';
    if (lower.includes('count') || lower.includes('average') || lower.includes('sum') || lower.includes('maximum') || lower.includes('minimum')) {
        intent = 'AGGREGATE';
    }

    return {
        tables,
        intent,
        joinsIdentified: 0 // Naive baseline cannot resolve foreign key relationships
    };
}

export function runNL2SQLBenchmark() {
    const schemaMap = parseSchemaContext(SAMPLE_SCHEMA_DDL);

    let baselineTableExactMatches = 0;
    let schemaAwareTableExactMatches = 0;
    let baselineIntentMatches = 0;
    let schemaAwareIntentMatches = 0;
    let schemaAwareJoinsResolved = 0;

    const baselineLatencies: number[] = [];
    const schemaAwareLatencies: number[] = [];
    const detailedResults: any[] = [];

    for (const testCase of NL2SQL_BENCHMARK_CORPUS) {
        // Run Baseline
        const startBase = performance.now();
        const baseResult = runNaiveBaseline(testCase.naturalLanguage);
        const endBase = performance.now();
        baselineLatencies.push(endBase - startBase);

        // Run Schema-Aware Deterministic IR
        const startSA = performance.now();
        const irResult = buildQueryIR(testCase.naturalLanguage, schemaMap);
        const endSA = performance.now();
        schemaAwareLatencies.push(endSA - startSA);

        const expTablesNorm = [...testCase.expectedTables].sort().join(',');
        const baseTablesNorm = [...baseResult.tables].sort().join(',');
        const saTablesNorm = [...irResult.targetTables].sort().join(',');

        const baseTableCorrect = baseTablesNorm === expTablesNorm;
        const saTableCorrect = saTablesNorm === expTablesNorm;

        if (baseTableCorrect) baselineTableExactMatches++;
        if (saTableCorrect) schemaAwareTableExactMatches++;

        const baseIntentCorrect = baseResult.intent === testCase.expectedIntent;
        const saIntentCorrect = irResult.intent === testCase.expectedIntent;

        if (baseIntentCorrect) baselineIntentMatches++;
        if (saIntentCorrect) schemaAwareIntentMatches++;

        if (testCase.expectedFeatures.includes('JOIN') && irResult.joins.length > 0) {
            schemaAwareJoinsResolved++;
        }

        detailedResults.push({
            id: testCase.id,
            difficulty: testCase.difficulty,
            prompt: testCase.naturalLanguage,
            expectedTables: expTablesNorm,
            baselineTables: baseTablesNorm,
            baselineTableCorrect: baseTableCorrect,
            schemaAwareTables: saTablesNorm,
            schemaAwareTableCorrect: saTableCorrect,
            expectedIntent: testCase.expectedIntent,
            baselineIntent: baseResult.intent,
            schemaAwareIntent: irResult.intent,
            joinsResolved: irResult.joins.length,
            baselineLatencyMs: Number((endBase - startBase).toFixed(4)),
            schemaAwareLatencyMs: Number((endSA - startSA).toFixed(4))
        });
    }

    const total = NL2SQL_BENCHMARK_CORPUS.length;
    const multiTableCases = NL2SQL_BENCHMARK_CORPUS.filter(tc => tc.expectedFeatures.includes('JOIN')).length;

    baselineLatencies.sort((a, b) => a - b);
    schemaAwareLatencies.sort((a, b) => a - b);

    const summary = {
        totalQueriesTested: total,
        baselineTableAccuracy: Number(((baselineTableExactMatches / total) * 100).toFixed(2)),
        schemaAwareTableAccuracy: Number(((schemaAwareTableExactMatches / total) * 100).toFixed(2)),
        baselineIntentAccuracy: Number(((baselineIntentMatches / total) * 100).toFixed(2)),
        schemaAwareIntentAccuracy: Number(((schemaAwareIntentMatches / total) * 100).toFixed(2)),
        schemaAwareJoinPathResolutionRate: Number(((schemaAwareJoinsResolved / multiTableCases) * 100).toFixed(2)),
        baselineMedianLatencyMs: Number(baselineLatencies[Math.floor(baselineLatencies.length / 2)].toFixed(4)),
        schemaAwareMedianLatencyMs: Number(schemaAwareLatencies[Math.floor(schemaAwareLatencies.length / 2)].toFixed(4))
    };

    return { summary, detailedResults };
}

if (require.main === module) {
    const { summary, detailedResults } = runNL2SQLBenchmark();
    console.log('=== NL-TO-SQL INTENT & SCHEMA RESOLUTION BENCHMARK ===');
    console.table(summary);
}
