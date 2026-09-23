import type { User } from '../types';

export function buildFinancialPrompt(user: Partial<User> | null, question: string): string {
  const snapshot = user ? [
    `User ID: ${user.user_id ?? 'N/A'}`,
    `Monthly income: ₹${Number(user.monthly_income ?? 0).toLocaleString('en-IN')}`,
    `Monthly EMI: ₹${Number(user.monthly_emi ?? 0).toLocaleString('en-IN')}`,
    `Monthly cashflow: ₹${Number(user.monthly_cashflow ?? 0).toLocaleString('en-IN')}`,
    `Existing debt: ₹${Number(user.existing_debt ?? 0).toLocaleString('en-IN')}`,
    `Cashflow score: ${Number(user.cashflow_score ?? 0)}`,
    `Risk band: ${user.risk_band ?? 'Unknown'}`,
    `Active loans: ${Number(user.active_loan_count ?? 0)}`,
  ].join('\n') : 'No user profile available.';

  return `You are CrediMerge AI, a personal finance assistant for a user in India. Use the user's actual financial data below to answer questions about EMI, loans, credit health, and budgeting. Do not invent data. If the user asks for a recommendation, explain the trade-offs and include a conservative suggestion based on the user's affordability and risk.\n\nFinancial snapshot:\n${snapshot}\n\nUser question:\n${question}\n\nFinancial guidance only. Be concise, practical, and actionable.`;
}
