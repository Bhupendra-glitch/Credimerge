"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askGemini = askGemini;
const generative_ai_1 = require("@google/generative-ai");
async function askGemini(message, context = {}) {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
    if (!apiKey) {
        throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in the backend environment.');
    }
    if (!/^AIza[0-9A-Za-z\-_]{35}$/.test(apiKey)) {
        throw new Error('Invalid Gemini API key format. Use a valid Google AI Studio API key starting with AIza...');
    }
    const model = new generative_ai_1.GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
    });
    const prompt = `
You are the CrediMerge AI Assistant.

Explain only the financial information already calculated by the application.
Do not invent values, provide an official credit-bureau score, or make lending decisions.
If information is missing, say that it is unavailable. Keep the answer concise and useful.

APPLICATION CONTEXT:
${JSON.stringify(context, null, 2)}

USER QUESTION:
${message}
`;
    const result = await model.generateContent(prompt);
    return result.response.text();
}
