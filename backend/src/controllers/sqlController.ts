import { Request, Response } from 'express';
import { generateResponse } from '../ai/gemini';
import { parseSchemaContext, buildQueryIR } from '../nlp/nluParser';
import { parseAndExplainSql } from '../nlp/sqlAstAnalyzer';
import { query } from '../database/connection';

const sqlGenerateSchema = {
    type: 'object',
    properties: {
        sql: { type: 'string', description: 'The generated MySQL query' },
        explanation: { type: 'string', description: 'Step-by-step explanation' }
    },
    required: ['sql', 'explanation']
};

export const generateSql = async (req: Request, res: Response): Promise<void> => {
    try {
        const { request, schema } = req.body;
        
        if (!request) {
            res.status(400).json({ error: 'Natural language request is required' });
            return;
        }

        // 1. Deterministic NLP Phase: parse schema context and build Query Intermediate Representation
        const schemaMap = parseSchemaContext(schema);
        const queryIR = buildQueryIR(request, schemaMap);

        // 2. Deterministic Template Check (e.g. Simple table inspection / count / select)
        let generatedSql = '';
        let generatedExplanation = '';
        let generatedVia: 'DETERMINISTIC_NLP' | 'AI_REASONING' = 'AI_REASONING';

        const lowerReq = request.trim().toLowerCase();
        if ((lowerReq === 'show tables' || lowerReq === 'show tables;' || lowerReq === 'list tables') && !schema) {
            generatedSql = 'SHOW TABLES;';
            generatedExplanation = 'Lists all base tables and views present in the connected database.';
            generatedVia = 'DETERMINISTIC_NLP';
        } else if (queryIR.targetTables.length === 1 && queryIR.selectedMetrics.length === 1 && queryIR.selectedMetrics[0].func === 'COUNT') {
            const table = queryIR.targetTables[0];
            generatedSql = `SELECT COUNT(*) AS total_count FROM \`${table}\`;`;
            generatedExplanation = `Computes the total count of tuples in table '${table}'.`;
            generatedVia = 'DETERMINISTIC_NLP';
        } else if (queryIR.targetTables.length === 1 && queryIR.limit && !lowerReq.includes('where') && !lowerReq.includes('filter')) {
            const table = queryIR.targetTables[0];
            const orderClause = queryIR.orderBy.length > 0 ? ` ORDER BY \`${queryIR.orderBy[0].column}\` ${queryIR.orderBy[0].direction}` : '';
            generatedSql = `SELECT * FROM \`${table}\`${orderClause} LIMIT ${queryIR.limit};`;
            generatedExplanation = `Retrieves up to ${queryIR.limit} records from table '${table}'.`;
            generatedVia = 'DETERMINISTIC_NLP';
        }

        // 3. Fallback to Generative Reasoning with Schema-Aware Context if not solved by deterministic template
        if (!generatedSql) {
            const prompt = `
You are an expert Database Systems Engineer.
Given the database schema context:
\`\`\`sql
${schema || 'Standard relational tables'}
\`\`\`

Natural Language Request: "${request}"

Derived NLP Intermediate Representation:
- Intent: ${queryIR.intent}
- Target Tables: ${queryIR.targetTables.join(', ') || 'Auto-detect'}
- Join Paths: ${queryIR.joins.map(j => `${j.leftTable} <-> ${j.rightTable}`).join('; ') || 'None identified'}
- Ambiguities/Clarifications: ${queryIR.ambiguities.join('; ') || 'None'}

Generate a syntactically valid SQL query that directly satisfies this request.
Provide a clear explanation of how the query works.
Return the result strictly as JSON with 'sql' and 'explanation' fields.`;

            const responseText = await generateResponse(prompt, sqlGenerateSchema);
            const data = JSON.parse(responseText);
            generatedSql = data.sql;
            generatedExplanation = data.explanation;
        }

        // 4. SQL AST Parse & Clause Analysis
        const astAnalysis = parseAndExplainSql(generatedSql);

        res.json({
            sql: generatedSql,
            explanation: generatedExplanation,
            generatedVia,
            queryIR,
            astAnalysis
        });
    } catch (error) {
        console.error('SQL Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate SQL' });
    }
};

export const explainSql = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sql, schema } = req.body;
        if (!sql) {
            res.status(400).json({ error: 'SQL query is required' });
            return;
        }

        // Generate deterministic AST clause analysis
        const astAnalysis = parseAndExplainSql(sql);

        const steps = astAnalysis.clauses.map(c => `${c.clause}: ${c.details.join('; ')}`);
        res.json({
            steps,
            summary: astAnalysis.overallSummary,
            astAnalysis
        });
    } catch (error) {
        console.error('SQL Explanation Error:', error);
        res.status(500).json({ error: 'Failed to explain SQL' });
    }
};

export const validateSql = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sql } = req.body;
        if (!sql || typeof sql !== 'string' || !sql.trim()) {
            res.status(400).json({
                isValid: false,
                isDestructive: false,
                errors: [{ type: 'EMPTY_INPUT', location: 'Root', message: 'SQL query is required and cannot be empty', suggestion: 'Provide a valid SQL query' }]
            });
            return;
        }

        const astAnalysis = parseAndExplainSql(sql);

        if (!astAnalysis.syntaxValid) {
            res.status(400).json({
                isValid: false,
                isDestructive: astAnalysis.isDestructive,
                errors: [{
                    type: 'SYNTAX_ERROR',
                    location: 'Query body',
                    message: astAnalysis.parseError || 'Syntax error in SQL statement',
                    suggestion: 'Verify statement syntax, table/column identifiers, and dialect keywords'
                }],
                astAnalysis
            });
            return;
        }

        const errors = astAnalysis.concerns.map(c => ({
            type: 'SAFETY_OR_PERFORMANCE',
            location: 'Query body',
            message: c,
            suggestion: 'Review clause structure'
        }));

        res.json({
            isValid: true,
            isDestructive: astAnalysis.isDestructive,
            errors,
            astAnalysis
        });
    } catch (error: any) {
        console.error('SQL Validation Error:', error);
        res.status(400).json({
            isValid: false,
            isDestructive: false,
            errors: [{ type: 'SYNTAX_ERROR', location: 'Root', message: error.message, suggestion: 'Fix SQL syntax' }]
        });
    }
};

export const executeSql = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sql } = req.body;
        
        if (!sql || typeof sql !== 'string' || !sql.trim()) {
            res.status(400).json({ error: 'SQL query is required and must be a non-empty string' });
            return;
        }

        const trimmedSql = sql.trim();

        if (trimmedSql.length > 5000) {
            res.status(400).json({ error: 'Payload Too Large: SQL statement exceeds the 5,000 character limit.' });
            return;
        }

        // Disallow multiple semicolon-delimited statements in sandbox
        const statements = trimmedSql
            .split(';')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

        if (statements.length > 1) {
            res.status(403).json({ error: 'Security Exception: Multiple semicolon-separated SQL statements are disallowed in the execution sandbox.' });
            return;
        }

        const upperSql = trimmedSql.toUpperCase();
        if (!upperSql.startsWith('SELECT') && !upperSql.startsWith('SHOW') && !upperSql.startsWith('DESCRIBE') && !upperSql.startsWith('EXPLAIN')) {
            res.status(403).json({ error: 'Security Exception: Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are permitted.' });
            return;
        }

        // Disallow dangerous administrative keywords even inside read-only statements
        if (/\b(INTO\s+OUTFILE|INTO\s+DUMPFILE|LOAD_FILE|BENCHMARK|SLEEP)\b/i.test(trimmedSql)) {
            res.status(403).json({ error: 'Security Exception: Prohibited SQL execution function detected in sandbox.' });
            return;
        }

        // Validate AST syntax before sending to database engine
        const astAnalysis = parseAndExplainSql(trimmedSql);
        if (!astAnalysis.syntaxValid) {
            res.status(400).json({ error: `Syntax error: ${astAnalysis.parseError || 'Invalid SQL syntax'}` });
            return;
        }

        const maxRows = 500;
        const start = performance.now();
        
        // Execute with bounded query timeout of 5,000ms
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query execution timeout exceeded (5000ms limit).')), 5000)
        );
        const queryPromise = query(trimmedSql);
        const rawResults: any = await Promise.race([queryPromise, timeoutPromise]);
        
        const end = performance.now();

        const totalCount = Array.isArray(rawResults) ? rawResults.length : 0;
        const results = Array.isArray(rawResults) ? rawResults.slice(0, maxRows) : rawResults;
        const isTruncated = totalCount > maxRows;

        res.json({
            results,
            executionTime: (end - start).toFixed(2),
            rowCount: results.length,
            totalMatchedRows: totalCount,
            isTruncated,
            notice: isTruncated ? `Output truncated to first ${maxRows} records for safety.` : undefined
        });
    } catch (error: any) {
        console.error('SQL Execution Error:', error);
        res.status(400).json({ error: error.message || 'Failed to execute query' });
    }
};
