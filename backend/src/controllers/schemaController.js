"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSchema = void 0;
const express_1 = require("express");
const gemini_1 = require("../ai/gemini");
const analysisSchema = {
    type: 'object',
    properties: {
        normalization: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    form: { type: 'string', description: '1NF, 2NF, 3NF, BCNF' },
                    status: { type: 'string', description: 'PASS, WARNING, or ISSUE' },
                    explanation: { type: 'string' },
                    problem: { type: 'string' },
                    recommendation: { type: 'string' }
                },
                required: ['form', 'status', 'explanation']
            }
        },
        summary: { type: 'string' }
    },
    required: ['normalization', 'summary']
};
const analyzeSchema = async (req, res) => {
    try {
        const { schema, platform = 'MySQL' } = req.body;
        if (!schema) {
            res.status(400).json({ error: 'Schema code is required for analysis' });
            return;
        }
        const isNoSQL = platform.toLowerCase().includes('mongo');
        const formTypes = isNoSQL ? 'Embedding vs Referencing, Document Limits, Indexing Strategies' : '1NF, 2NF, 3NF, BCNF';
        const prompt = `
You are an expert Database Educator and Architect. 
Analyze the following ${platform} schema for design and normalization issues (${formTypes}).

Schema:
\`\`\`
${schema}
\`\`\`

Return a JSON object containing an array 'normalization' with analysis.
For each concept (e.g., "1NF", "2NF", "3NF", "BCNF" for SQL, or "Embedding", "Referencing", "Indexing" for NoSQL):
- form: The concept or normal form being evaluated.
- status: "PASS", "WARNING", or "ISSUE"
- explanation: Explain the result in beginner-friendly language.
- problem: Description of any detected problem (repeating groups, unbounded arrays, partial dependency, etc.). Omit or leave empty if PASS.
- recommendation: Original Structure -> Identified Problem -> Recommended Structure. Omit if PASS.

Also provide an overall 'summary'.
Ensure the JSON is valid.`;
        const responseText = await (0, gemini_1.generateResponse)(prompt, analysisSchema);
        const analysisData = JSON.parse(responseText);
        res.json(analysisData);
    }
    catch (error) {
        console.error('Schema Analysis Error:', error);
        res.status(500).json({ error: 'Failed to analyze schema' });
    }
};
exports.analyzeSchema = analyzeSchema;
//# sourceMappingURL=schemaController.js.map