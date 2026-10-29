import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSqlExecutionPolicy } from '../../src/security/sqlExecutionPolicy';

describe('SQL Execution Policy & AST Sandbox Structural Validation Unit Tests', () => {
    describe('Allowed Read-Only Statements and Safe CTEs', () => {
        it('allows standard SELECT query with projections and filters', () => {
            const result = validateSqlExecutionPolicy('SELECT id, name, email FROM users WHERE id = 1');
            assert.equal(result.isAllowed, true);
            assert.equal(result.statementType, 'select');
            assert.equal(result.hasCte, false);
        });

        it('allows safe Common Table Expression (WITH ... SELECT)', () => {
            const query = 'WITH active_users AS (SELECT id, name FROM users WHERE status = "active") SELECT * FROM active_users;';
            const result = validateSqlExecutionPolicy(query);
            assert.equal(result.isAllowed, true);
            assert.equal(result.statementType, 'select');
            assert.equal(result.hasCte, true);
        });

        it('allows multiple chained safe CTE expressions', () => {
            const query = `
                WITH high_spenders AS (
                    SELECT customer_id, SUM(amount) AS total FROM orders GROUP BY customer_id
                ),
                vip_customers AS (
                    SELECT customer_id FROM high_spenders WHERE total > 1000
                )
                SELECT c.name, v.customer_id FROM customers c JOIN vip_customers v ON c.id = v.customer_id;
            `;
            const result = validateSqlExecutionPolicy(query);
            assert.equal(result.isAllowed, true);
            assert.equal(result.hasCte, true);
        });

        it('allows SHOW TABLES query', () => {
            const result = validateSqlExecutionPolicy('SHOW TABLES');
            assert.equal(result.isAllowed, true);
            assert.equal(result.statementType, 'show');
        });

        it('allows DESCRIBE query', () => {
            const result = validateSqlExecutionPolicy('DESCRIBE users');
            assert.equal(result.isAllowed, true);
            assert.equal(result.statementType, 'desc');
        });

        it('allows EXPLAIN query on SELECT', () => {
            const result = validateSqlExecutionPolicy('EXPLAIN SELECT * FROM users');
            assert.equal(result.isAllowed, true);
            assert.equal(result.statementType, 'explain');
        });
    });

    describe('Prohibited Data Modifying Operations & CTE Mutators', () => {
        it('strictly blocks data-modifying CTE containing UPDATE statement', () => {
            const query = 'WITH cte AS (SELECT 1 AS x) UPDATE users SET name = "test"';
            const result = validateSqlExecutionPolicy(query);
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes("Disallowed statement type 'update'"));
        });

        it('strictly blocks data-modifying CTE containing DELETE statement', () => {
            const query = 'WITH cte AS (SELECT 1 AS x) DELETE FROM users';
            const result = validateSqlExecutionPolicy(query);
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes("Disallowed statement type 'delete'"));
        });

        it('strictly blocks raw INSERT statement', () => {
            const result = validateSqlExecutionPolicy('INSERT INTO users (name) VALUES ("attacker")');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes("Disallowed statement type 'insert'"));
        });

        it('strictly blocks raw UPDATE statement', () => {
            const result = validateSqlExecutionPolicy('UPDATE users SET role = "admin" WHERE id = 1');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes("Disallowed statement type 'update'"));
        });

        it('strictly blocks raw DELETE statement', () => {
            const result = validateSqlExecutionPolicy('DELETE FROM users WHERE id = 1');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes("Disallowed statement type 'delete'"));
        });

        it('strictly blocks raw DROP TABLE statement', () => {
            const result = validateSqlExecutionPolicy('DROP TABLE users');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes("Disallowed statement type 'drop'"));
        });

        it('strictly blocks TRUNCATE statement', () => {
            const result = validateSqlExecutionPolicy('TRUNCATE TABLE users');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes('Disallowed statement type'));
        });
    });

    describe('Multiple Semicolon-Separated Statements', () => {
        it('rejects multiple statements chained with semicolons', () => {
            const result = validateSqlExecutionPolicy('SELECT 1; DROP TABLE users;');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes('Multiple semicolon-separated SQL statements are disallowed'));
        });

        it('rejects multiple read-only statements chained together', () => {
            const result = validateSqlExecutionPolicy('SELECT 1; SELECT 2;');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes('Multiple semicolon-separated SQL statements are disallowed'));
        });
    });

    describe('File Export and Dangerous Execution Function Invariants', () => {
        it('strictly blocks INTO OUTFILE file export clause', () => {
            const result = validateSqlExecutionPolicy('SELECT * FROM users INTO OUTFILE "/tmp/compromised.txt"');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes('INTO OUTFILE'));
        });

        it('strictly blocks INTO DUMPFILE binary export clause', () => {
            const result = validateSqlExecutionPolicy('SELECT * FROM users INTO DUMPFILE "/tmp/binary_leak.bin"');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes('INTO DUMPFILE'));
        });

        it('strictly blocks SLEEP function in projection', () => {
            const result = validateSqlExecutionPolicy('SELECT SLEEP(5)');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes('SLEEP'));
        });

        it('strictly blocks SLEEP function hidden inside subquery condition', () => {
            const query = 'SELECT * FROM users WHERE id = (SELECT 1 FROM dual WHERE SLEEP(3))';
            const result = validateSqlExecutionPolicy(query);
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes('SLEEP'));
        });

        it('strictly blocks BENCHMARK function invocation', () => {
            const result = validateSqlExecutionPolicy('SELECT BENCHMARK(1000000, MD5(1))');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes('BENCHMARK'));
        });

        it('strictly blocks LOAD_FILE function invocation', () => {
            const result = validateSqlExecutionPolicy('SELECT LOAD_FILE("/etc/passwd")');
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes('LOAD_FILE'));
        });
    });

    describe('Malformed Input and Boundary Constraints', () => {
        it('rejects empty query strings', () => {
            const result = validateSqlExecutionPolicy('   ');
            assert.equal(result.isAllowed, false);
            assert.equal(result.isSyntaxError, true);
        });

        it('rejects queries exceeding 5,000 characters', () => {
            const longQuery = 'SELECT ' + 'a, '.repeat(2000) + ' 1';
            const result = validateSqlExecutionPolicy(longQuery);
            assert.equal(result.isAllowed, false);
            assert.ok(result.reason?.includes('5,000 character limit'));
        });

        it('rejects ungrammatical syntax with informative syntax error', () => {
            const result = validateSqlExecutionPolicy('SELECT FROM WHERE');
            assert.equal(result.isAllowed, false);
            assert.equal(result.isSyntaxError, true);
            assert.ok(result.reason?.includes('Syntax error'));
        });
    });
});
