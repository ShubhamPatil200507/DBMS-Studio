"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = void 0;
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const apiKey = process.env.GEMINI_API_KEY;
let ai = null;
if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    ai = new genai_1.GoogleGenAI({ apiKey });
}
const generateResponse = async (prompt, schema, retries = 2) => {
    if (!ai) {
        throw new Error('Gemini API key is not configured.');
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
                responseMimeType: schema ? 'application/json' : 'text/plain',
                responseSchema: schema,
                temperature: 0.2
            }
        });
        return response.text;
    }
    catch (error) {
        console.error('AI Generation error:', error?.message || error);
        if (retries > 0 && error?.status === 503) {
            console.log('Retrying due to 503 error...');
            await new Promise(res => setTimeout(res, 2000));
            return (0, exports.generateResponse)(prompt, schema, retries - 1);
        }
        throw new Error('Failed to generate response from AI');
    }
};
exports.generateResponse = generateResponse;
//# sourceMappingURL=gemini.js.map