export interface LoanAppCheckInput {
  appName: string;
  website?: string;
  requestedPermissions?: string;
  repaymentDays?: number;
  upfrontFee?: boolean;
  harassmentThreats?: boolean;
  lenderLicenseConfirmed?: boolean;
}

export interface LoanAppCheckResult {
  appName: string;
  riskScore: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  verdict: string;
  reasons: string[];
  saferSteps: string[];
}

export function assessLoanApp(input: LoanAppCheckInput): LoanAppCheckResult {
  const reasons: string[] = [];
  let riskScore = 0;
  const permissions = (input.requestedPermissions || '').toLowerCase();
  const website = (input.website || '').trim().toLowerCase();
  const repaymentDays = Number(input.repaymentDays || 0);

  if (!input.appName.trim()) throw new Error('App or lender name is required');
  if (input.upfrontFee) {
    riskScore += 25;
    reasons.push('An upfront processing, verification, or release fee is requested.');
  }
  if (/contact|sms|call log|gallery|photo|accessibility|device admin|screen lock/.test(permissions)) {
    riskScore += 25;
    reasons.push('The app requests sensitive device permissions unrelated to responsible lending.');
  }
  if (repaymentDays > 0 && repaymentDays <= 7) {
    riskScore += 20;
    reasons.push('The repayment window is unusually short and can increase rollover pressure.');
  }
  if (input.harassmentThreats) {
    riskScore += 30;
    reasons.push('Threats, abusive collection messages, or contact-list harassment were reported.');
  }
  if (!input.lenderLicenseConfirmed) {
    riskScore += 15;
    reasons.push('The lender license or regulated financial institution status is not confirmed.');
  }
  if (!website) {
    riskScore += 10;
    reasons.push('No official website was provided for verification.');
  } else if (!website.startsWith('https://')) {
    riskScore += 10;
    reasons.push('The provided website does not use HTTPS.');
  }

  riskScore = Math.min(100, riskScore);
  const riskLevel = riskScore >= 70 ? 'Critical' : riskScore >= 45 ? 'High' : riskScore >= 20 ? 'Moderate' : 'Low';
  const verdict = riskLevel === 'Low'
    ? 'No major warning signals were found from the information provided.'
    : riskLevel === 'Moderate'
      ? 'Proceed carefully and verify the lender before sharing documents or paying money.'
      : riskLevel === 'High'
        ? 'High-risk signals detected. Avoid borrowing until the lender is independently verified.'
        : 'Critical warning signals detected. Do not pay or share sensitive data without official verification.';

  return {
    appName: input.appName.trim(),
    riskScore,
    riskLevel,
    verdict,
    reasons,
    saferSteps: [
      'Verify the lender through the official financial regulator or the lender’s verified website.',
      'Never pay an upfront fee to release a loan.',
      'Deny contacts, SMS, gallery, and accessibility permissions unless they are genuinely necessary.',
      'Save abusive messages and report suspected illegal recovery practices to local authorities.',
    ],
  };
}
