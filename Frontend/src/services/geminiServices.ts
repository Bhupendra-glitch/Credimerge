import { api } from '../api/client';

export interface AIContext {
  user?: Record<string, unknown> | null;
  loans?: unknown[];
  dashboard?: Record<string, unknown> | null;
  creditHealth?: Record<string, unknown> | null;
}

export async function askGemini(
  message: string,
  context: AIContext,
): Promise<string> {
  const response = await api.chatWithAI(message, context);
  return response.data.text;
}