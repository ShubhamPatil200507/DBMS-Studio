"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
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
        sql_schema: { type: 'string', description: 'Complete MySQL CREATE TABLE statements' },
        explanation: { type: 'string', description: 'Short explanation of the design' }
    },
    required: ['entities', 'relationships', 'sql_schema', 'explanation']
};
const testApi = async () => {
    try {
        const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: 'Create a DB for a school',
            config: {
                responseMimeType: 'application/json',
                responseSchema: schemaDefinition
            }
        });
        console.log('Success:', res.text);
    }
    catch (e) {
        console.error('API Error:', e.message);
    }
};
testApi();
//# sourceMappingURL=testApi.js.map