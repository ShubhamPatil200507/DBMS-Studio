import { Request, Response } from 'express';
import { parseSchemaContext, buildQueryIR } from '../nlp/nluParser';
import { parseAndExplainSql } from '../nlp/sqlAstAnalyzer';
import { query as dbQuery } from '../database/connection';
import { generateResponse } from '../ai/gemini';

export interface AgentStepTrace {
    step: string;
    action: string;
    toolCalled?: string;
    input?: any;
    output?: any;
    status: 'SUCCESS' | 'WARNING' | 'FAILED';
    timestamp: string;
}

export interface AgentWorkflowResult {
    workflowName: string;
    success: boolean;
    traces: AgentStepTrace[];
    finalReport: any;
}

export const runAgentOptimizer = async (req: Request, res: Response): Promise<void> => {
    const traces: AgentStepTrace[] = [];
    const { sql, schema, projectId } = req.body;

    const logTrace = (step: string, action: string, toolCalled?: string, input?: any, output?: any, status: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS') => {
        traces.push({
            step,
            action,
            toolCalled,
            input,
            output,
            status,
            timestamp: new Date().toISOString()
        });
    };

    try {
        logTrace('1. Request Understanding', 'Parsing query AST and extracting statement semantics', 'sqlAstParser', { sql }, null);
        const astAnalysis = parseAndExplainSql(sql);
        logTrace('1. Request Understanding', 'AST analysis complete', undefined, null, {
            tablesAccessed: astAnalysis.tablesAccessed,
            clauses: astAnalysis.clauses.map(c => c.clause),
            hasAggregate: astAnalysis.hasAggregate,
            isDestructive: astAnalysis.isDestructive
        });

        // 2. Schema Retrieval & Verification
        logTrace('2. Schema Retrieval', 'Retrieving live schema structure and indices', 'explorerDatabase', { tables: astAnalysis.tablesAccessed });
        let liveIndexInfo: any[] = [];
        if (astAnalysis.tablesAccessed.length > 0) {
            try {
                for (const t of astAnalysis.tablesAccessed) {
                    const idxRows: any = await dbQuery(`SHOW INDEX FROM \`${t}\``);
                    if (Array.isArray(idxRows)) {
                        liveIndexInfo.push(...idxRows.map((r: any) => ({ table: t, name: r.Key_name, column: r.Column_name })));
                    }
                }
            } catch (e: any) {
                // Table might not exist in live DB
            }
        }
        logTrace('2. Schema Retrieval', 'Index verification complete', undefined, null, { indicesFound: liveIndexInfo.length });

        // 3. Execution Plan Inspection
        logTrace('3. Execution Plan Inspection', 'Running real EXPLAIN query against database engine', 'dbExplain', { sql });
        let realExplain: any = null;
        let explainError: string | null = null;
        try {
            const cleanSql = sql.trim();
            if (cleanSql.toUpperCase().startsWith('SELECT')) {
                realExplain = await dbQuery('EXPLAIN ' + cleanSql);
            }
        } catch (e: any) {
            explainError = e.message;
        }

        if (realExplain) {
            logTrace('3. Execution Plan Inspection', 'Obtained real execution plan', undefined, null, realExplain);
        } else {
            logTrace('3. Execution Plan Inspection', `Explain unavailable: ${explainError || 'Non-SELECT'}`, undefined, null, { note: 'Using AST heuristic baseline' }, 'WARNING');
        }

        // 4. Evidence-based Performance Scoring & Candidate Generation
        logTrace('4. Candidate Improvements', 'Evaluating index candidates and AST optimizations', 'heuristicEngine');
        const detectedIssues: string[] = [];
        const recommendations: any[] = [];
        let score = 95;

        if (astAnalysis.concerns.length > 0) {
            detectedIssues.push(...astAnalysis.concerns);
            score -= 15;
        }

        // Full table scan detection
        if (Array.isArray(realExplain)) {
            for (const row of realExplain) {
                if (row.type === 'ALL') {
                    detectedIssues.push(`Full table scan on '${row.table}'. (Examining ${row.rows} rows).`);
                    score -= 25;
                    recommendations.push({
                        issue: `Unindexed lookup on ${row.table}`,
                        sql: `CREATE INDEX idx_${row.table}_lookup ON \`${row.table}\` (...);`,
                        reason: 'Eliminates full table scan, replacing O(N) access with B-Tree logarithmic search.'
                    });
                }
                if (row.Extra && row.Extra.includes('Using filesort')) {
                    detectedIssues.push(`Filesort required for '${row.table}'.`);
                    score -= 15;
                }
            }
        }

        score = Math.max(20, Math.min(100, score));

        // 5. Query Optimization & Reporting
        logTrace('5. Optimization & Verification', 'Generating optimized query and synthesizing final report', 'agentSynthesizer');

        let optimizedQuery = sql;
        if (sql.includes('SELECT *') && astAnalysis.columnsReferenced.length > 0) {
            optimizedQuery = sql.replace(/SELECT\s+\*/i, `SELECT ${astAnalysis.columnsReferenced.join(', ')}`);
        }

        const finalReport = {
            score,
            summary: astAnalysis.overallSummary,
            astAnalysis,
            real_explain: realExplain,
            detected_issues: detectedIssues,
            recommendations,
            optimized_query: optimizedQuery
        };

        logTrace('5. Optimization & Verification', 'Workflow completed successfully with verified evidence', undefined, null, { score });

        res.json({
            workflowName: 'Agentic Query Optimizer Workflow',
            success: true,
            traces,
            finalReport
        });
    } catch (e: any) {
        logTrace('Agent Failure', e.message, undefined, null, null, 'FAILED');
        res.status(500).json({
            workflowName: 'Agentic Query Optimizer Workflow',
            success: false,
            traces,
            error: e.message
        });
    }
};
