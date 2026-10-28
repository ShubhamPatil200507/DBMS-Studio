import { parseSchemaContext, buildQueryIR } from '../src/nlp/nluParser';

export interface NL2SQLTestCase {
    id: string;
    naturalLanguage: string;
    expectedTables: string[];
    expectedIntent: 'SELECT' | 'AGGREGATE' | 'INSERT' | 'UPDATE' | 'DELETE';
    expectedFeatures: string[];
    difficulty: 'SIMPLE' | 'MEDIUM' | 'COMPLEX';
    split: 'PRESERVED_ORIGINAL' | 'UNSEEN_EVALUATION';
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

// Original 20 Queries (Preserved Corpus)
export const NL2SQL_BENCHMARK_CORPUS: NL2SQLTestCase[] = [
    {
        id: 'NL-01',
        naturalLanguage: 'Show all users',
        expectedTables: ['users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['SELECT'],
        difficulty: 'SIMPLE',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-02',
        naturalLanguage: 'Count the total number of orders',
        expectedTables: ['orders'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['COUNT'],
        difficulty: 'SIMPLE',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-03',
        naturalLanguage: 'Get the first 5 reviews',
        expectedTables: ['reviews'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['LIMIT'],
        difficulty: 'SIMPLE',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-04',
        naturalLanguage: 'Show all order items sorted by price descending',
        expectedTables: ['order_items'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['ORDER_BY'],
        difficulty: 'SIMPLE',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-05',
        naturalLanguage: 'List users with their corresponding orders',
        expectedTables: ['orders', 'users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN'],
        difficulty: 'MEDIUM',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-06',
        naturalLanguage: 'Find orders and the items purchased in each order',
        expectedTables: ['order_items', 'orders'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN'],
        difficulty: 'MEDIUM',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-07',
        naturalLanguage: 'Show users who wrote reviews',
        expectedTables: ['reviews', 'users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN'],
        difficulty: 'MEDIUM',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-08',
        naturalLanguage: 'Retrieve users where email ends with example.com',
        expectedTables: ['users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['FILTER'],
        difficulty: 'MEDIUM',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-09',
        naturalLanguage: 'Calculate the total revenue from orders',
        expectedTables: ['orders'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['SUM'],
        difficulty: 'MEDIUM',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-10',
        naturalLanguage: 'Calculate the average rating across all reviews',
        expectedTables: ['reviews'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['AVG'],
        difficulty: 'MEDIUM',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-11',
        naturalLanguage: 'Count the number of orders per user',
        expectedTables: ['orders', 'users'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['GROUP_BY', 'JOIN'],
        difficulty: 'COMPLEX',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-12',
        naturalLanguage: 'Find top 3 users with the highest order volume',
        expectedTables: ['orders', 'users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['LIMIT', 'ORDER_BY', 'JOIN'],
        difficulty: 'COMPLEX',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-13',
        naturalLanguage: 'Display average product price per order item',
        expectedTables: ['order_items'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['AVG'],
        difficulty: 'COMPLEX',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-14',
        naturalLanguage: 'List orders with total amounts exceeding 500 dollars',
        expectedTables: ['orders'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['FILTER'],
        difficulty: 'MEDIUM',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-15',
        naturalLanguage: 'Find users with pending orders',
        expectedTables: ['orders', 'users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN', 'FILTER'],
        difficulty: 'COMPLEX',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-16',
        naturalLanguage: 'List reviews with 5 star ratings sorted by creation date',
        expectedTables: ['reviews'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['FILTER', 'ORDER_BY'],
        difficulty: 'MEDIUM',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-17',
        naturalLanguage: 'Count distinct users who made at least one purchase',
        expectedTables: ['orders', 'users'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['COUNT', 'JOIN'],
        difficulty: 'COMPLEX',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-18',
        naturalLanguage: 'Find maximum order amount in the orders database',
        expectedTables: ['orders'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['MAX'],
        difficulty: 'MEDIUM',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-19',
        naturalLanguage: 'Show users registered recently ordered by id desc limit 10',
        expectedTables: ['users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['LIMIT', 'ORDER_BY'],
        difficulty: 'SIMPLE',
        split: 'PRESERVED_ORIGINAL'
    },
    {
        id: 'NL-20',
        naturalLanguage: 'List users who gave 1 star reviews with their comments',
        expectedTables: ['reviews', 'users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN', 'FILTER'],
        difficulty: 'COMPLEX',
        split: 'PRESERVED_ORIGINAL'
    }
];

// Separate Unseen Evaluation Corpus (20 Unseen Queries)
export const NL2SQL_UNSEEN_EVALUATION_CORPUS: NL2SQLTestCase[] = [
    {
        id: 'UNSEEN-01',
        naturalLanguage: 'Find all customers who registered this year',
        expectedTables: ['users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['FILTER'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-02',
        naturalLanguage: 'Show total amount spent by each customer',
        expectedTables: ['orders', 'users'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['GROUP_BY', 'JOIN'],
        difficulty: 'COMPLEX',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-03',
        naturalLanguage: 'List products with prices higher than 100 dollars in order items',
        expectedTables: ['order_items'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['FILTER'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-04',
        naturalLanguage: 'Count reviews with rating less than 3',
        expectedTables: ['reviews'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['COUNT', 'FILTER'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-05',
        naturalLanguage: 'Show customer names along with their review comments',
        expectedTables: ['reviews', 'users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN'],
        difficulty: 'MEDIUM',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-06',
        naturalLanguage: 'Compute the maximum item quantity in any order item',
        expectedTables: ['order_items'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['MAX'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-07',
        naturalLanguage: 'Find top 5 highest total orders',
        expectedTables: ['orders'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['LIMIT', 'ORDER_BY'],
        difficulty: 'MEDIUM',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-08',
        naturalLanguage: 'Retrieve all orders placed with pending status',
        expectedTables: ['orders'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['FILTER'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-09',
        naturalLanguage: 'List order items for order 101 sorted by price',
        expectedTables: ['order_items'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['ORDER_BY', 'FILTER'],
        difficulty: 'MEDIUM',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-10',
        naturalLanguage: 'Count total reviews submitted across all products',
        expectedTables: ['reviews'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['COUNT'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-11',
        naturalLanguage: 'Show customers with their purchased order items',
        expectedTables: ['order_items', 'orders', 'users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN'],
        difficulty: 'COMPLEX',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-12',
        naturalLanguage: 'Find average order total amount across completed transactions',
        expectedTables: ['orders'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['AVG', 'FILTER'],
        difficulty: 'MEDIUM',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-13',
        naturalLanguage: 'List user accounts created in current year ordered by name',
        expectedTables: ['users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['ORDER_BY'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-14',
        naturalLanguage: 'Show all products purchased with quantity above 2 in order items',
        expectedTables: ['order_items'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['FILTER'],
        difficulty: 'MEDIUM',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-15',
        naturalLanguage: 'Find minimum rating given in product reviews',
        expectedTables: ['reviews'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['MIN'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-16',
        naturalLanguage: 'List reviews with comments ordered by rating desc limit 5',
        expectedTables: ['reviews'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['LIMIT', 'ORDER_BY'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-17',
        naturalLanguage: 'Calculate total revenue sum from all customer purchases',
        expectedTables: ['orders'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['SUM'],
        difficulty: 'MEDIUM',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-18',
        naturalLanguage: 'Show top 10 users registered recently ordered by created_at desc',
        expectedTables: ['users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['LIMIT', 'ORDER_BY'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-19',
        naturalLanguage: 'Find user accounts with both orders and reviews',
        expectedTables: ['orders', 'reviews', 'users'],
        expectedIntent: 'SELECT',
        expectedFeatures: ['JOIN'],
        difficulty: 'COMPLEX',
        split: 'UNSEEN_EVALUATION'
    },
    {
        id: 'UNSEEN-20',
        naturalLanguage: 'Count distinct products listed in order items',
        expectedTables: ['order_items'],
        expectedIntent: 'AGGREGATE',
        expectedFeatures: ['COUNT'],
        difficulty: 'SIMPLE',
        split: 'UNSEEN_EVALUATION'
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
    if (lower.includes('count') || lower.includes('average') || lower.includes('avg') || lower.includes('sum') || lower.includes('maximum') || lower.includes('minimum') || lower.includes('min') || lower.includes('max') || lower.includes('total') || lower.includes('revenue')) {
        intent = 'AGGREGATE';
    }

    return {
        tables,
        intent,
        joinsIdentified: 0
    };
}

function evaluateCorpus(corpus: NL2SQLTestCase[], schemaMap: Map<string, any>) {
    let baselineTableMatches = 0;
    let schemaAwareTableMatches = 0;
    let baselineIntentMatches = 0;
    let schemaAwareIntentMatches = 0;
    let schemaAwareJoinsResolved = 0;

    const baselineLatencies: number[] = [];
    const schemaAwareLatencies: number[] = [];
    const detailedResults: any[] = [];

    for (const testCase of corpus) {
        const startBase = performance.now();
        const baseResult = runNaiveBaseline(testCase.naturalLanguage);
        const endBase = performance.now();
        baselineLatencies.push(endBase - startBase);

        const startSA = performance.now();
        const irResult = buildQueryIR(testCase.naturalLanguage, schemaMap);
        const endSA = performance.now();
        schemaAwareLatencies.push(endSA - startSA);

        const expTablesNorm = [...testCase.expectedTables].sort().join(',');
        const baseTablesNorm = [...baseResult.tables].sort().join(',');
        const saTablesNorm = [...irResult.targetTables].sort().join(',');

        const baseTableCorrect = baseTablesNorm === expTablesNorm;
        const saTableCorrect = saTablesNorm === expTablesNorm;

        if (baseTableCorrect) baselineTableMatches++;
        if (saTableCorrect) schemaAwareTableMatches++;

        const baseIntentCorrect = baseResult.intent === testCase.expectedIntent;
        const saIntentCorrect = irResult.intent === testCase.expectedIntent;

        if (baseIntentCorrect) baselineIntentMatches++;
        if (saIntentCorrect) schemaAwareIntentMatches++;

        if (testCase.expectedFeatures.includes('JOIN') && irResult.joins.length > 0) {
            schemaAwareJoinsResolved++;
        }

        detailedResults.push({
            id: testCase.id,
            split: testCase.split,
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

    const total = corpus.length;
    const multiTableCases = corpus.filter(tc => tc.expectedFeatures.includes('JOIN')).length;

    baselineLatencies.sort((a, b) => a - b);
    schemaAwareLatencies.sort((a, b) => a - b);

    const summary = {
        totalQueriesTested: total,
        baselineTableAccuracy: Number(((baselineTableMatches / total) * 100).toFixed(2)),
        schemaAwareTableAccuracy: Number(((schemaAwareTableMatches / total) * 100).toFixed(2)),
        baselineIntentAccuracy: Number(((baselineIntentMatches / total) * 100).toFixed(2)),
        schemaAwareIntentAccuracy: Number(((schemaAwareIntentMatches / total) * 100).toFixed(2)),
        schemaAwareJoinPathResolutionRate: multiTableCases > 0 
            ? Number(((schemaAwareJoinsResolved / multiTableCases) * 100).toFixed(2))
            : 100,
        baselineMedianLatencyMs: Number(baselineLatencies[Math.floor(baselineLatencies.length / 2)].toFixed(4)),
        schemaAwareMedianLatencyMs: Number(schemaAwareLatencies[Math.floor(schemaAwareLatencies.length / 2)].toFixed(4))
    };

    return { summary, detailedResults };
}

export function runNL2SQLBenchmark() {
    const schemaMap = parseSchemaContext(SAMPLE_SCHEMA_DDL);

    const preserved = evaluateCorpus(NL2SQL_BENCHMARK_CORPUS, schemaMap);
    const unseen = evaluateCorpus(NL2SQL_UNSEEN_EVALUATION_CORPUS, schemaMap);
    const combinedCorpus = [...NL2SQL_BENCHMARK_CORPUS, ...NL2SQL_UNSEEN_EVALUATION_CORPUS];
    const combined = evaluateCorpus(combinedCorpus, schemaMap);

    const summary = {
        preservedCorpus_tableAccuracy: preserved.summary.schemaAwareTableAccuracy,
        preservedCorpus_baselineTableAccuracy: preserved.summary.baselineTableAccuracy,
        unseenCorpus_tableAccuracy: unseen.summary.schemaAwareTableAccuracy,
        unseenCorpus_baselineTableAccuracy: unseen.summary.baselineTableAccuracy,
        combinedTotalQueries: combined.summary.totalQueriesTested,
        combinedTableAccuracy: combined.summary.schemaAwareTableAccuracy,
        combinedIntentAccuracy: combined.summary.schemaAwareIntentAccuracy,
        combinedJoinResolutionRate: combined.summary.schemaAwareJoinPathResolutionRate,
        schemaAwareMedianLatencyMs: combined.summary.schemaAwareMedianLatencyMs
    };

    return {
        summary,
        preservedCorpus: preserved,
        unseenCorpus: unseen,
        detailedResults: combined.detailedResults
    };
}

if (require.main === module) {
    const { summary, preservedCorpus, unseenCorpus } = runNL2SQLBenchmark();
    console.log('=== NL-TO-SQL RESOLUTION BENCHMARK: PRESERVED ORIGINAL SET ===');
    console.table(preservedCorpus.summary);
    console.log('=== NL-TO-SQL RESOLUTION BENCHMARK: UNSEEN EVALUATION SET ===');
    console.table(unseenCorpus.summary);
    console.log('=== COMBINED NL-TO-SQL SUMMARY ===');
    console.table(summary);
}
