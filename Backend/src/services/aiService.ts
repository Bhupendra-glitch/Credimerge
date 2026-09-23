import { getUserProfile } from './firestoreService';

type UserProfileSummary = {
  userId?: string;
  user_id?: string;
  monthly_income?: number | string;
  monthly_emi?: number | string;
  monthly_cashflow?: number | string;
  existing_debt?: number | string;
  cashflow_score?: number | string;
  risk_band?: string;
  active_loan_count?: number | string;
};

export async function generateFinancialAdvice(userId: string, message: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Add your Gemini API key to the backend environment.');
  }

  const user = (await getUserProfile(userId)) as UserProfileSummary | null;
  const profile = user ? [
    `User ID: ${user.userId ?? user.user_id ?? 'N/A'}`,
    `Monthly income: ₹${Number(user.monthly_income ?? 0).toLocaleString('en-IN')}`,
    `Monthly EMI: ₹${Number(user.monthly_emi ?? 0).toLocaleString('en-IN')}`,
    `Monthly cashflow: ₹${Number(user.monthly_cashflow ?? 0).toLocaleString('en-IN')}`,
    `Existing debt: ₹${Number(user.existing_debt ?? 0).toLocaleString('en-IN')}`,
    `Cashflow score: ${Number(user.cashflow_score ?? 0)}`,
    `Risk band: ${user.risk_band ?? 'Unknown'}`,
    `Active loans: ${Number(user.active_loan_count ?? 0)}`,
  ].join('\n') : 'User profile unavailable.';

  const systemPrompt = `You are CrediMerge AI, an Indian personal finance assistant. Use the user profile below to answer questions about EMI, loans, credit health, debt management, and budgeting. Keep answers practical, concise, and grounded in the user's data. If you are unsure, say so and give a conservative recommendation. Do not claim to know private data that is missing. Use INR currency formatting when relevant.`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{
          text: `${systemPrompt}\n\nUser financial profile:\n${profile}\n\nUser question:\n${message}\n\nAnswer in plain language and keep it brief but actionable.`
        }],
      },
    ],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json() as any;
  const answer = data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text ?? '')
    .join('')
    .trim();

  if (!answer) {
    throw new Error('Gemini returned an empty response.');
  }

  return answer;
}
