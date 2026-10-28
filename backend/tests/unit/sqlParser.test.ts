import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAndExplainSql } from '../../src/nlp/sqlAstAnalyzer';

describe('SQL Parser & AST Analyzer Unit Tests', () => {
    it('successfully parses standard SELECT queries with joins and projections', () => {
        const sql = 'SELECT u.id, u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.total > 100 ORDER BY o.total DESC LIMIT 10;';
        const res = parseAndExplainSql(sql);

        assert.equal(res.syntaxValid, true);
        assert.equal(res.parseError, undefined);
        assert.ok(res.tablesAccessed.includes('users'));
        assert.ok(res.tablesAccessed.includes('orders'));
        assert.equal(res.joins.length, 1);
        assert.equal(res.isDestructive, false);
    });

    it('correctly detects unqualified wildcard SELECT * and raises performance concern', () => {
        const sql = 'SELECT * FROM users WHERE email = "test@example.com";';
        const res = parseAndExplainSql(sql);

        assert.equal(res.syntaxValid, true);
        assert.ok(res.columnsReferenced.includes('*'), 'columnsReferenced must contain *');
        assert.ok(
            res.concerns.some(c => c.includes('PERFORMANCE: Wildcard projection (*)')),
            'Must flag PERFORMANCE concern for SELECT *'
        );
        assert.ok(res.clauses.some(c => c.details.some(d => d.includes('Wildcard projection: *'))));
    });

    it('correctly detects table-qualified wildcard SELECT u.* and raises performance concern', () => {
        const sql = 'SELECT u.*, o.id FROM users u JOIN orders o ON u.id = o.user_id;';
        const res = parseAndExplainSql(sql);

        assert.equal(res.syntaxValid, true);
        assert.ok(res.columnsReferenced.includes('u.*'), 'columnsReferenced must contain u.*');
        assert.ok(
            res.concerns.some(c => c.includes('PERFORMANCE: Wildcard projection (u.*)')),
            'Must flag PERFORMANCE concern for SELECT u.*'
        );
    });

    it('handles explicit column projections without false wildcard warnings', () => {
        const sql = 'SELECT id, email, created_at FROM users WHERE id = 42;';
        const res = parseAndExplainSql(sql);

        assert.equal(res.syntaxValid, true);
        assert.deepEqual(res.columnsReferenced, ['id', 'email', 'created_at']);
        assert.ok(
            !res.concerns.some(c => c.includes('Wildcard projection')),
            'Must not flag wildcard concern for explicit projections'
        );
    });

    it('correctly maps multi-table joins and table aliases', () => {
        const sql = 'SELECT c.name, o.id, p.title FROM customers c INNER JOIN orders o ON c.id = o.customer_id LEFT JOIN products p ON o.product_id = p.id;';
        const res = parseAndExplainSql(sql);

        assert.equal(res.syntaxValid, true);
        assert.deepEqual(res.tablesAccessed, ['customers', 'orders', 'products']);
        assert.equal(res.joins.length, 2);
    });

    it('rejects malformed and ungrammatical SQL with syntaxValid = false', () => {
        const malformed = 'SELECT FROM WHERE;';
        const res = parseAndExplainSql(malformed);

        assert.equal(res.syntaxValid, false);
        assert.ok(res.parseError && res.parseError.length > 0);
        assert.ok(res.concerns.some(c => c.includes('AST Parser Notice')));
    });

    it('rejects misspelled SQL keywords (SELEC, FORM) with syntaxValid = false', () => {
        const brokenQueries = [
            'SELEC id FORM users;',
            'SELECT * FORM orders;',
            'INSERT INTO;',
            'UPDATE users SET WHERE id = 1;'
        ];

        for (const sql of brokenQueries) {
            const res = parseAndExplainSql(sql);
            assert.equal(res.syntaxValid, false, `Query "${sql}" must fail validation`);
            assert.ok(res.parseError, `Query "${sql}" must populate parseError`);
        }
    });

    it('rejects empty SQL string with syntaxValid = false', () => {
        const res = parseAndExplainSql('   ');

        assert.equal(res.syntaxValid, false);
        assert.equal(res.parseError, 'SQL query is empty.');
    });

    it('detects destructive queries and warns on unbounded DELETE without WHERE', () => {
        const destructive = 'DELETE FROM customers;';
        const res = parseAndExplainSql(destructive);

        assert.equal(res.syntaxValid, true);
        assert.equal(res.isDestructive, true);
        assert.ok(res.concerns.some(c => c.includes('CRITICAL: Modifying statement without WHERE clause')));
    });

    it('identifies queries with aggregation functions', () => {
        const sql = 'SELECT department_id, COUNT(*), AVG(salary) FROM employees GROUP BY department_id HAVING COUNT(*) > 5;';
        const res = parseAndExplainSql(sql);

        assert.equal(res.syntaxValid, true);
        assert.equal(res.hasAggregate, true);
        assert.ok(res.clauses.some(c => c.clause.includes('GROUP BY')));
        assert.ok(res.clauses.some(c => c.clause.includes('HAVING')));
    });
});
