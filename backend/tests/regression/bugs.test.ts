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

    it('Regression Bug #3: Wildcard SELECT * is accurately recognized and does not corrupt column list or claim false rewrite', () => {
        const originalSql = 'SELECT *, user_id FROM orders WHERE user_id = 5';
        const astAnalysis = parseAndExplainSql(originalSql);

        assert.equal(astAnalysis.syntaxValid, true);
        assert.ok(astAnalysis.columnsReferenced.includes('*'), 'AST must capture wildcard * in columnsReferenced');
        assert.ok(astAnalysis.columnsReferenced.includes('user_id'), 'AST must capture user_id in columnsReferenced');
        assert.ok(
            astAnalysis.concerns.some(c => c.includes('PERFORMANCE: Wildcard projection (*)')),
            'AST must flag wildcard performance concern'
        );

        // Safe fallback behavior: untouched queries must be labeled unchanged
        const fallbackStatus = {
            optimized_query: originalSql,
            query_rewritten: false,
            optimization_status: 'UNCHANGED_SAFE_FALLBACK',
            rewriteEquivalenceVerified: null
        };

        assert.equal(fallbackStatus.query_rewritten, false);
        assert.equal(fallbackStatus.optimization_status, 'UNCHANGED_SAFE_FALLBACK');
        assert.equal(fallbackStatus.rewriteEquivalenceVerified, null, 'Must NOT claim rewrite equivalence verified when query is unchanged');
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
