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

    it('rejects malformed and ungrammatical SQL with syntaxValid = false', () => {
        const malformed = 'SELECT FROM WHERE;';
        const res = parseAndExplainSql(malformed);

        assert.equal(res.syntaxValid, false);
        assert.ok(res.parseError && res.parseError.length > 0);
        assert.ok(res.concerns.some(c => c.includes('AST Parser Notice')));
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
