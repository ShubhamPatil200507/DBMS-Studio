import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

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
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: 'Create a DB for a school',
            config: {
                responseMimeType: 'application/json',
                responseSchema: schemaDefinition as any
            }
        });
        console.log('Success:', res.text);
    } catch (e: any) {
        console.error('API Error:', e.message);
    }
};

testApi();
