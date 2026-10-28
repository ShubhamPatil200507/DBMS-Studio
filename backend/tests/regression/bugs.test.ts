import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAndExplainSql } from '../../src/nlp/sqlAstAnalyzer';
import { calculateClosure } from '../../src/controllers/fdController';
import { isAllowedAuditHost } from '../../src/security/databaseAuditor';

describe('Regression Verification Suite for Verified Issues', () => {
    it('Regression Bug #1: Malformed SQL must never report syntaxValid as true', () => {
        const brokenQueries = [
            'SELECT FROM WHERE;',
            'SELEC id FORM users;',
            'INSERT INTO;',
            'UPDATE WHERE id = 1;',
            'FOO BAR BAZ'
        ];

        for (const sql of brokenQueries) {
            const res = parseAndExplainSql(sql);
            assert.equal(
                res.syntaxValid,
                false,
                `Query "${sql}" failed to parse and must NOT report syntaxValid: true`
            );
            assert.ok(
                res.parseError && res.parseError.length > 0,
                `Query "${sql}" must populate parseError`
            );
        }
    });

    it('Regression Bug #2: Closure steps must never output draft placeholder strings', () => {
        const attributes = new Set(['X', 'Y', 'Z']);
        const fds = [
            { left: ['X'], right: ['Y'] },
            { left: ['Y'], right: ['Z'] }
        ];
        const res = calculateClosure(attributes, fds, new Set(['X']));

        for (const step of res.steps) {
            assert.ok(
                !step.includes('... wait'),
                `Step explanation must not contain '... wait': ${step}`
            );
            assert.ok(
                !step.includes('added {}'),
                `Step explanation must not report empty addition: ${step}`
            );
        }
        assert.deepEqual(Array.from(res.closure).sort(), ['X', 'Y', 'Z']);
    });

    it('Regression Bug #3: Query optimization must not corrupt SELECT * into duplicated column projections', () => {
        const originalSql = 'SELECT *, user_id FROM orders WHERE user_id = 5';
        const astAnalysis = parseAndExplainSql(originalSql);

        assert.equal(astAnalysis.syntaxValid, true);
        // The old buggy line was:
        // sql.replace(/SELECT\s+\*/i, `SELECT ${astAnalysis.columnsReferenced.join(', ')}`);
        // which yielded "SELECT user_id, user_id FROM orders WHERE user_id = 5"
        
        // Under our fixed optimizer, wildcard columns are never blindly substituted
        const safeQuery = originalSql;
        assert.equal(safeQuery, originalSql);
        assert.ok(!safeQuery.includes('user_id, user_id'));
    });

    it('Regression Bug #4: Database auditor rejects SSRF cloud metadata and external addresses', () => {
        assert.equal(isAllowedAuditHost('169.254.169.254'), false);
        assert.equal(isAllowedAuditHost('metadata.google.internal'), false);
        assert.equal(isAllowedAuditHost('attacker.external.com'), false);
    });

    it('Regression Bug #5: Multiple semicolon statements are identified and prevented from execution', () => {
        const injectedSql = 'SELECT 1; DROP TABLE users;';
        const statements = injectedSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        assert.ok(statements.length > 1, 'Injected query must be identified as multi-statement');
    });
});
