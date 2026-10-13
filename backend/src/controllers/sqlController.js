"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeSql = exports.validateSql = exports.explainSql = exports.generateSql = void 0;
const express_1 = require("express");
const gemini_1 = require("../ai/gemini");
const nluParser_1 = require("../nlp/nluParser");
const sqlAstAnalyzer_1 = require("../nlp/sqlAstAnalyzer");
const connection_1 = require("../database/connection");
const sqlGenerateSchema = {
    type: 'object',
    properties: {
        sql: { type: 'string', description: 'The generated MySQL query' },
        explanation: { type: 'string', description: 'Step-by-step explanation' }
    },
    required: ['sql', 'explanation']
};
const generateSql = async (req, res) => {
    try {
        const { request, schema } = req.body;
        if (!request) {
            res.status(400).json({ error: 'Natural language request is required' });
            return;
        }
        // 1. Deterministic NLP Phase: parse schema context and build Query Intermediate Representation
        const schemaMap = (0, nluParser_1.parseSchemaContext)(schema);
        const queryIR = (0, nluParser_1.buildQueryIR)(request, schemaMap);
        // 2. Deterministic Template Check (e.g. Simple table inspection / count / select)
        let generatedSql = '';
        let generatedExplanation = '';
        let generatedVia = 'AI_REASONING';
        const lowerReq = request.trim().toLowerCase();
        if ((lowerReq === 'show tables' || lowerReq === 'show tables;' || lowerReq === 'list tables') && !schema) {
            generatedSql = 'SHOW TABLES;';
            generatedExplanation = 'Lists all base tables and views present in the connected database.';
            generatedVia = 'DETERMINISTIC_NLP';
        }
        else if (queryIR.targetTables.length === 1 && queryIR.selectedMetrics.length === 1 && queryIR.selectedMetrics[0].func === 'COUNT') {
            const table = queryIR.targetTables[0];
            generatedSql = `SELECT COUNT(*) AS total_count FROM \`${table}\`;`;
            generatedExplanation = `Computes the total count of tuples in table '${table}'.`;
            generatedVia = 'DETERMINISTIC_NLP';
        }
        else if (queryIR.targetTables.length === 1 && queryIR.limit && !lowerReq.includes('where') && !lowerReq.includes('filter')) {
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
            const responseText = await (0, gemini_1.generateResponse)(prompt, sqlGenerateSchema);
            const data = JSON.parse(responseText);
            generatedSql = data.sql;
            generatedExplanation = data.explanation;
        }
        // 4. SQL AST Parse & Clause Analysis
        const astAnalysis = (0, sqlAstAnalyzer_1.parseAndExplainSql)(generatedSql);
        res.json({
            sql: generatedSql,
            explanation: generatedExplanation,
            generatedVia,
            queryIR,
            astAnalysis
        });
    }
    catch (error) {
        console.error('SQL Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate SQL' });
    }
};
exports.generateSql = generateSql;
const explainSql = async (req, res) => {
    try {
        const { sql, schema } = req.body;
        if (!sql) {
            res.status(400).json({ error: 'SQL query is required' });
            return;
        }
        // Generate deterministic AST clause analysis
        const astAnalysis = (0, sqlAstAnalyzer_1.parseAndExplainSql)(sql);
        const steps = astAnalysis.clauses.map(c => `${c.clause}: ${c.details.join('; ')}`);
        res.json({
            steps,
            summary: astAnalysis.overallSummary,
            astAnalysis
        });
    }
    catch (error) {
        console.error('SQL Explanation Error:', error);
        res.status(500).json({ error: 'Failed to explain SQL' });
    }
};
exports.explainSql = explainSql;
const validateSql = async (req, res) => {
    try {
        const { sql, schema } = req.body;
        if (!sql) {
            res.status(400).json({ error: 'SQL query is required' });
            return;
        }
        const astAnalysis = (0, sqlAstAnalyzer_1.parseAndExplainSql)(sql);
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
    }
    catch (error) {
        console.error('SQL Validation Error:', error);
        res.status(400).json({
            isValid: false,
            isDestructive: false,
            errors: [{ type: 'SYNTAX_ERROR', location: 'Root', message: error.message, suggestion: 'Fix SQL syntax' }]
        });
    }
};
exports.validateSql = validateSql;
const executeSql = async (req, res) => {
    try {
        const { sql } = req.body;
        if (!sql) {
            res.status(400).json({ error: 'SQL query is required' });
            return;
        }
        const upperSql = sql.trim().toUpperCase();
        if (!upperSql.startsWith('SELECT') && !upperSql.startsWith('SHOW') && !upperSql.startsWith('DESCRIBE') && !upperSql.startsWith('EXPLAIN')) {
            res.status(403).json({ error: 'Security Exception: Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are permitted.' });
            return;
        }
        const start = performance.now();
        const results = await (0, connection_1.query)(sql);
        const end = performance.now();
        res.json({
            results,
            executionTime: (end - start).toFixed(2),
            rowCount: Array.isArray(results) ? results.length : 0
        });
    }
    catch (error) {
        console.error('SQL Execution Error:', error);
        res.status(400).json({ error: error.message || 'Failed to execute query' });
    }
};
exports.executeSql = executeSql;
//# sourceMappingURL=sqlController.js.map