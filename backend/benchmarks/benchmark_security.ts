import { scanCodeSnippet } from '../src/security/sourceAuditor';
import fs from 'fs';
import path from 'path';

export interface SecurityTestCase {
    id: string;
    code: string;
    expectedVulnerable: boolean;
    expectedCategory?: string;
    description: string;
}

export const SECURITY_BENCHMARK_CORPUS: SecurityTestCase[] = [
    // --- 25 VULNERABLE CASES (Ground Truth: Positives) ---
    {
        id: 'SEC-POS-01',
        code: "const query = 'SELECT * FROM users WHERE email = \\'' + req.body.email + '\\'';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-001',
        description: 'Direct string concatenation of req.body into SQL WHERE'
    },
    {
        id: 'SEC-POS-02',
        code: "const q = 'SELECT * FROM products WHERE id = ' + req.query.id;",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-001',
        description: 'Direct concatenation of numeric req.query parameter'
    },
    {
        id: 'SEC-POS-03',
        code: "const sql = `SELECT * FROM accounts WHERE acc_id = ${req.params.id}`;",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-001',
        description: 'Template literal interpolation with req.params'
    },
    {
        id: 'SEC-POS-04',
        code: "db.query(`SELECT * FROM customers WHERE name = '${input}'`);",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-002',
        description: 'Template literal inside db.query call'
    },
    {
        id: 'SEC-POS-05',
        code: "execute(`DELETE FROM audit_logs WHERE id = ${payload.id}`);",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-002',
        description: 'execute() call with template variable interpolation'
    },
    {
        id: 'SEC-POS-06',
        code: "raw(`UPDATE inventory SET quantity = 0 WHERE code = ${code}`);",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-002',
        description: 'raw() database query with raw interpolation'
    },
    {
        id: 'SEC-POS-07',
        code: "db.query('DELETE FROM users');",
        expectedVulnerable: true,
        expectedCategory: 'SEC-DATA-003',
        description: 'DELETE FROM without WHERE clause'
    },
    {
        id: 'SEC-POS-08',
        code: "db.query('UPDATE accounts SET balance = 0');",
        expectedVulnerable: true,
        expectedCategory: 'SEC-DATA-003',
        description: 'UPDATE without WHERE clause'
    },
    {
        id: 'SEC-POS-09',
        code: "const db_pass = 'SecretAdminPassword123!';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-CRED-004',
        description: 'Hardcoded database password literal'
    },
    {
        id: 'SEC-POS-10',
        code: "const api_key = 'sk_live_9876543210abcdef!';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-CRED-004',
        description: 'Hardcoded API secret token'
    },
    {
        id: 'SEC-POS-11',
        code: "const token = 'ghp_ABCDEFGHIJKLMNOPQRST1234';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-CRED-004',
        description: 'Hardcoded personal access token'
    },
    {
        id: 'SEC-POS-12',
        code: "const query = 'SELECT password FROM users WHERE id = 1';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-AUTH-005',
        description: 'Querying plaintext password column'
    },
    {
        id: 'SEC-POS-13',
        code: "const q = 'INSERT INTO users (name, password) VALUES (a, b)';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-AUTH-005',
        description: 'Inserting unhashed password attribute'
    },
    {
        id: 'SEC-POS-14',
        code: "const sql = 'SELECT * FROM orders WHERE status = \\'' + request.GET['status'] + '\\'';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-001',
        description: 'Django-style request.GET concatenation'
    },
    {
        id: 'SEC-POS-15',
        code: "const stmt = 'SELECT * FROM members WHERE group = \\'' + request.POST['grp'] + '\\'';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-001',
        description: 'Django/PHP request.POST concatenation'
    },
    {
        id: 'SEC-POS-16',
        code: "const s = 'SELECT * FROM logs WHERE level = %s' % (input);",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-001',
        description: 'Python style %s string formatting injection'
    },
    {
        id: 'SEC-POS-17',
        code: "const query = 'SELECT * FROM items WHERE cat = {}'.format(payload);",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-001',
        description: 'Python style str.format() injection'
    },
    {
        id: 'SEC-POS-18',
        code: "db.query(`SELECT id FROM users WHERE role = ${body.role}`);",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-002',
        description: 'Direct body attribute in template query call'
    },
    {
        id: 'SEC-POS-19',
        code: "const sql = 'DELETE FROM temp_sessions';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-DATA-003',
        description: 'Destructive DELETE without WHERE constraint'
    },
    {
        id: 'SEC-POS-20',
        code: "const secret = 'prod_secret_key_xyz987654';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-CRED-004',
        description: 'Hardcoded production secret'
    },
    {
        id: 'SEC-POS-21',
        code: "const query = 'SELECT * FROM invoices WHERE client_id = ' + params.clientId;",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-001',
        description: 'Direct concatenation of params object property'
    },
    {
        id: 'SEC-POS-22',
        code: "db.execute(`SELECT * FROM staff WHERE dept = ${req.query.dept}`);",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-002',
        description: 'execute() with req.query interpolation'
    },
    {
        id: 'SEC-POS-23',
        code: "const q = 'UPDATE employees SET active = false';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-DATA-003',
        description: 'Unbounded UPDATE statement without WHERE'
    },
    {
        id: 'SEC-POS-24',
        code: "const password = 'ProductionRootPassword2026!';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-CRED-004',
        description: 'Hardcoded admin password variable'
    },
    {
        id: 'SEC-POS-25',
        code: "const query = 'UPDATE users SET password = \\'' + input + '\\'';",
        expectedVulnerable: true,
        expectedCategory: 'SEC-SQLI-001',
        description: 'Concatenating raw input into UPDATE statement'
    },

    // --- 25 SAFE CASES (Ground Truth: Negatives) ---
    {
        id: 'SEC-NEG-01',
        code: "db.query('SELECT * FROM users WHERE id = ?', [userId]);",
        expectedVulnerable: false,
        description: 'Properly parameterized query with placeholder'
    },
    {
        id: 'SEC-NEG-02',
        code: "const q = 'SELECT id, name FROM products WHERE category = ? AND price < ?';",
        expectedVulnerable: false,
        description: 'Parameterized prepared statement with multiple bindings'
    },
    {
        id: 'SEC-NEG-03',
        code: "db.execute('DELETE FROM session_tokens WHERE user_id = ?', [uid]);",
        expectedVulnerable: false,
        description: 'Parameterized DELETE query with WHERE clause'
    },
    {
        id: 'SEC-NEG-04',
        code: "const sql = 'UPDATE users SET status = ? WHERE id = ?';",
        expectedVulnerable: false,
        description: 'Safe UPDATE with explicit WHERE placeholders'
    },
    {
        id: 'SEC-NEG-05',
        code: "const db_pass = process.env.DB_PASSWORD;",
        expectedVulnerable: false,
        description: 'Database credentials read from environment variables'
    },
    {
        id: 'SEC-NEG-06',
        code: "const api_key = process.env.GEMINI_API_KEY;",
        expectedVulnerable: false,
        description: 'Secret key accessed via process.env'
    },
    {
        id: 'SEC-NEG-07',
        code: "const token = process.env.AUTH_TOKEN || '';",
        expectedVulnerable: false,
        description: 'Token read from process.env with default fallback'
    },
    {
        id: 'SEC-NEG-08',
        code: "const hash = await bcrypt.hash(req.body.password, 12);",
        expectedVulnerable: false,
        description: 'Password properly hashed using bcrypt'
    },
    {
        id: 'SEC-NEG-09',
        code: "const query = 'SELECT password_hash FROM users WHERE email = ?';",
        expectedVulnerable: false,
        description: 'Selecting hashed password with parameterized binding'
    },
    {
        id: 'SEC-NEG-10',
        code: "const count = 10 + 20;",
        expectedVulnerable: false,
        description: 'Standard arithmetic addition'
    },
    {
        id: 'SEC-NEG-11',
        code: "const greeting = `Hello, ${user.name}!`;",
        expectedVulnerable: false,
        description: 'Harmless string template literal without SQL keywords'
    },
    {
        id: 'SEC-NEG-12',
        code: "const msg = 'User input: ' + req.body.comment;",
        expectedVulnerable: false,
        description: 'String concatenation without SQL sinks'
    },
    {
        id: 'SEC-NEG-13',
        code: "const query = 'SELECT * FROM countries ORDER BY name ASC';",
        expectedVulnerable: false,
        description: 'Static query without user variables'
    },
    {
        id: 'SEC-NEG-14',
        code: "const password = 'your_mysql_password';",
        expectedVulnerable: false,
        description: 'Example documentation placeholder'
    },
    {
        id: 'SEC-NEG-15',
        code: "const example = 'your_api_key_here';",
        expectedVulnerable: false,
        description: 'Standard template placeholder string'
    },
    {
        id: 'SEC-NEG-16',
        code: "const sql = 'SHOW TABLES;';",
        expectedVulnerable: false,
        description: 'Safe static administrative read query'
    },
    {
        id: 'SEC-NEG-17',
        code: "const schema = fs.readFileSync('schema.sql', 'utf8');",
        expectedVulnerable: false,
        description: 'Reading schema file from local disk'
    },
    {
        id: 'SEC-NEG-18',
        code: "const result = await pool.query('SELECT 1 + 1 AS sum');",
        expectedVulnerable: false,
        description: 'Static healthcheck query'
    },
    {
        id: 'SEC-NEG-19',
        code: "const filtered = items.filter(i => i.price > 100);",
        expectedVulnerable: false,
        description: 'In-memory JavaScript array filter'
    },
    {
        id: 'SEC-NEG-20',
        code: "db.query('INSERT INTO audit_log (action, user_id) VALUES (?, ?)', ['LOGIN', uid]);",
        expectedVulnerable: false,
        description: 'Parameterized INSERT with audit log values'
    },
    {
        id: 'SEC-NEG-21',
        code: "const isValid = argon2.verify(hash, password);",
        expectedVulnerable: false,
        description: 'Argon2 cryptographic password verification'
    },
    {
        id: 'SEC-NEG-22',
        code: "res.json({ status: 'ok', count: results.length });",
        expectedVulnerable: false,
        description: 'Standard HTTP response serialization'
    },
    {
        id: 'SEC-NEG-23',
        code: "const valid = /^[a-zA-Z0-9_]+$/.test(tableName);",
        expectedVulnerable: false,
        description: 'Regex identifier validation guard'
    },
    {
        id: 'SEC-NEG-24',
        code: "const port = Number(process.env.PORT) || 5000;",
        expectedVulnerable: false,
        description: 'Numeric port parsing from environment'
    },
    {
        id: 'SEC-NEG-25',
        code: "db.query('SELECT count(*) FROM orders WHERE user_id = ?', [req.user.id]);",
        expectedVulnerable: false,
        description: 'Parameterized aggregate query with session user id'
    }
];

export function runSecurityBenchmark() {
    let tp = 0; // True Positive: Vulnerable, predicted Vulnerable
    let fp = 0; // False Positive: Safe, predicted Vulnerable
    let tn = 0; // True Negative: Safe, predicted Safe
    let fn = 0; // False Negative: Vulnerable, predicted Safe

    const results: any[] = [];
    const latencies: number[] = [];

    for (const testCase of SECURITY_BENCHMARK_CORPUS) {
        const start = performance.now();
        const findings = scanCodeSnippet(testCase.code);
        const end = performance.now();
        latencies.push(end - start);

        const isPredictedVulnerable = findings.length > 0;
        const correct = isPredictedVulnerable === testCase.expectedVulnerable;

        if (testCase.expectedVulnerable && isPredictedVulnerable) {
            tp++;
        } else if (!testCase.expectedVulnerable && isPredictedVulnerable) {
            fp++;
        } else if (!testCase.expectedVulnerable && !isPredictedVulnerable) {
            tn++;
        } else if (testCase.expectedVulnerable && !isPredictedVulnerable) {
            fn++;
        }

        results.push({
            id: testCase.id,
            description: testCase.description,
            expectedVulnerable: testCase.expectedVulnerable,
            predictedVulnerable: isPredictedVulnerable,
            correct,
            findingsCount: findings.length,
            findingsRules: findings.map(f => f.ruleId).join('; '),
            latencyMs: Number((end - start).toFixed(4))
        });
    }

    latencies.sort((a, b) => a - b);
    const medianLatencyMs = latencies[Math.floor(latencies.length / 2)];
    const meanLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    const total = SECURITY_BENCHMARK_CORPUS.length;
    const accuracy = (tp + tn) / total;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const summary = {
        totalSamples: total,
        positives: tp + fn,
        negatives: tn + fp,
        truePositives: tp,
        falsePositives: fp,
        trueNegatives: tn,
        falseNegatives: fn,
        accuracy: Number((accuracy * 100).toFixed(2)),
        precision: Number((precision * 100).toFixed(2)),
        recall: Number((recall * 100).toFixed(2)),
        f1Score: Number((f1 * 100).toFixed(2)),
        meanLatencyMs: Number(meanLatencyMs.toFixed(4)),
        medianLatencyMs: Number(medianLatencyMs.toFixed(4))
    };

    return { summary, results };
}

if (require.main === module) {
    const { summary, results } = runSecurityBenchmark();
    console.log('=== SQL SECURITY DETECTION BENCHMARK SUMMARY ===');
    console.table(summary);
}
