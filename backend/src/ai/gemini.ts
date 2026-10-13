import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    ai = new GoogleGenAI({ apiKey });
}

export const generateResponse = async (prompt: string, schema?: any, retries = 2): Promise<string> => {
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
    } catch (error: any) {
        console.error('AI Generation error:', error?.message || error);
        if (retries > 0 && error?.status === 503) {
            console.log('Retrying due to 503 error...');
            await new Promise(res => setTimeout(res, 2000));
            return generateResponse(prompt, schema, retries - 1);
        }
        throw new Error('Failed to generate response from AI');
    }
};
