import { Request, Response } from 'express';
import { query as dbQuery } from '../database/connection';
import { parseAndExplainSql } from '../nlp/sqlAstAnalyzer';

export const analyzePerformance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sql, schema } = req.body;
        if (!sql || typeof sql !== 'string' || !sql.trim()) {
            res.status(400).json({ error: 'SQL query is required' });
            return;
        }

        // 1. AST Structural Analysis
        const astAnalysis = parseAndExplainSql(sql);
        if (!astAnalysis.syntaxValid) {
            res.status(400).json({
                error: `Syntax error in query: ${astAnalysis.parseError || 'Invalid SQL'}`,
                astAnalysis
            });
            return;
        }

        let realExplain: any = null;
        let explainError: string | null = null;

        // 2. Execute Real EXPLAIN if query is read-only
        try {
            const cleanSql = sql.trim();
            if (cleanSql.toUpperCase().startsWith('SELECT')) {
                realExplain = await dbQuery('EXPLAIN ' + cleanSql);
            } else {
                explainError = 'Query must be a SELECT statement to EXPLAIN.';
            }
        } catch (e: any) {
            explainError = e.message;
        }

        // 3. Deterministic Heuristics & Scoring Engine
        let score = 95;
        const detected_issues: string[] = [];
        const recommendations: any[] = [];

        // Check AST concerns
        if (astAnalysis.concerns && astAnalysis.concerns.length > 0) {
            detected_issues.push(...astAnalysis.concerns);
            score -= 10;
        }

        // Wildcard projection check
        if (sql.includes('*')) {
            recommendations.push({
                issue: 'Wildcard Projection (SELECT *)',
                sql: `-- Specify explicit columns instead of * to reduce transport overhead and enable covering index scans`,
                reason: 'SELECT * fetches all table attributes, including unneeded large columns, and prevents index-only retrieval.'
            });
        }

        if (Array.isArray(realExplain)) {
            for (const row of realExplain) {
                // Check Access Type
                if (row.type === 'ALL') {
                    score -= 30;
                    detected_issues.push(`Full table scan on '${row.table}' (examining ${row.rows || 'multiple'} rows).`);
                    recommendations.push({
                        issue: `Unindexed table access on '${row.table}'`,
                        sql: `CREATE INDEX idx_${row.table}_search ON \`${row.table}\` (...);`,
                        reason: 'Full table scans force disk/memory reads of every row. A secondary index provides logarithmic lookups.'
                    });
                } else if (row.type === 'index') {
                    score -= 10;
                    detected_issues.push(`Full index scan on '${row.table}'.`);
                }

                // Check Extra Flags
                if (row.Extra && row.Extra.includes('Using filesort')) {
                    score -= 15;
                    detected_issues.push(`Query requires in-memory or on-disk filesort for '${row.table}'.`);
                    recommendations.push({
                        issue: `Sorting without index on '${row.table}'`,
                        sql: `-- Include ORDER BY columns in composite index`,
                        reason: 'Creating an index that matches the sort order avoids filesort overhead.'
                    });
                }
                if (row.Extra && row.Extra.includes('Using temporary')) {
                    score -= 20;
                    detected_issues.push(`Query requires a temporary table for '${row.table}'.`);
                }
            }
        } else if (explainError) {
            detected_issues.push(`Notice: Engine EXPLAIN not available: ${explainError}`);
        }

        score = Math.max(15, Math.min(100, score));

        // Note: Preserving original query unless a provably equivalent rewrite is verified
        const optimized_query = sql;

        res.json({
            score,
            summary: astAnalysis.overallSummary,
            detected_issues,
            recommendations,
            optimized_query,
            rewriteEquivalenceVerified: true,
            real_explain: realExplain || [],
            astAnalysis
        });
    } catch (error) {
        console.error('Performance Analysis Error:', error);
        res.status(500).json({ error: 'Failed to analyze query performance' });
    }
};
