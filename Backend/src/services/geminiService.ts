import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIContext {
  user?: Record<string, unknown> | null;
  loans?: unknown[];
  dashboard?: Record<string, unknown> | null;
  creditHealth?: Record<string, unknown> | null;
}

export async function askGemini(message: string, context: AIContext = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
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
