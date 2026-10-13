"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDesign = void 0;
const express_1 = require("express");
const gemini_1 = require("../ai/gemini");
const schemaDefinition = {
    type: 'object',
    properties: {
        entities: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    attributes: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                type: { type: 'string' },
                                primaryKey: { type: 'boolean' }
                            },
                            required: ['name', 'type']
                        }
                    }
                },
                required: ['name', 'attributes']
            }
        },
        relationships: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    source: { type: 'string' },
                    target: { type: 'string' },
                    type: { type: 'string', description: 'e.g., 1:1, 1:N, M:N' },
                    foreignKey: { type: 'string' }
                },
                required: ['source', 'target', 'type']
            }
        },
        schema_code: { type: 'string', description: 'Complete CREATE TABLE or Schema definition code' },
        explanation: { type: 'string', description: 'Short explanation of the design' }
    },
    required: ['entities', 'relationships', 'schema_code', 'explanation']
};
const generateDesign = async (req, res) => {
    try {
        const { requirement, platform = 'MySQL' } = req.body;
        if (!requirement) {
            res.status(400).json({ error: 'Requirement is required' });
            return;
        }
        const isNoSQL = platform.toLowerCase().includes('mongo');
        const schemaInstructions = isNoSQL
            ? `Valid MongoDB collection validation schemas or Mongoose models.`
            : `Valid ${platform} CREATE TABLE statements with appropriate foreign keys and constraints.`;
        const prompt = `
You are an expert Database Architect. The user has provided the following requirement:
"${requirement}"
Target Platform: ${platform}

Design a database schema for this requirement optimized for ${platform}.
Return a structured JSON with:
1. 'entities': Array of tables/collections and columns/fields (with data types and primary key flags).
2. 'relationships': Array of relationships between entities (source, target, cardinality type, foreign key).
3. 'schema_code': ${schemaInstructions}
4. 'explanation': A brief, beginner-friendly explanation of the database design.

Ensure the code is ${platform} compatible. Do not include markdown formatting in the JSON, just the raw JSON.`;
        const responseText = await (0, gemini_1.generateResponse)(prompt, schemaDefinition);
        const designData = JSON.parse(responseText);
        res.json(designData);
    }
    catch (error) {
        console.error('Design Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate database design' });
    }
};
exports.generateDesign = generateDesign;
//# sourceMappingURL=designController.js.map