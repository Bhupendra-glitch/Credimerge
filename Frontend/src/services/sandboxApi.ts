import client from '../api/client';

export interface PANVerificationPayload {
  pan: string;
  nameAsPerPan?: string;
  dateOfBirth?: string;
}

export interface GSTVerificationPayload {
  gstin: string;
}

export interface BankAccountVerificationPayload {
  accountNumber: string;
  ifsc: string;
}

export interface SandboxVerificationResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface NormalizedPANData {
  success: boolean;
  status: 'VERIFIED' | 'FAILED';
  verificationType: 'PAN';
  maskedIdentifier: string;
  category: string;
  nameMatched: boolean;
  nameAsPerPan?: string;
  aadhaarSeedingStatus?: string;
  referenceId: string;
  provider: 'SANDBOX';
  message: string;
  verifiedAt: string;
}

export interface NormalizedGSTData {
  success: boolean;
  status: 'VERIFIED' | 'FAILED';
  verificationType: 'GST';
  maskedIdentifier: string;
  legalName?: string;
  tradeName?: string;
  taxpayerStatus: string;
  constitution?: string;
  referenceId: string;
  provider: 'SANDBOX';
  message: string;
  verifiedAt: string;
}

export interface NormalizedBankData {
  success: boolean;
  status: 'VERIFIED' | 'FAILED';
  verificationType: 'BANK_ACCOUNT';
  maskedIdentifier: string;
  ifsc: string;
  accountHolderName?: string;
  accountExists: boolean;
  referenceId: string;
  provider: 'SANDBOX';
  message: string;
  verifiedAt: string;
}

export interface SandboxVerificationRecord {
  id: string;
  userId: string;
  verificationType: 'PAN' | 'GST' | 'BANK_ACCOUNT';
  status: 'VERIFIED' | 'FAILED' | 'PENDING';
  referenceId?: string;
  provider: string;
  maskedIdentifier?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SandboxStatusInfo {
  success: boolean;
  service: string;
  environment: string;
  configured: boolean;
  tigerDataConnected: boolean;
}

export const sandboxApi = {
  getStatus: () =>
    client.get<SandboxStatusInfo>('/api/sandbox/status'),

  getVerifications: () =>
    client.get<{ success: boolean; data: { verifications: SandboxVerificationRecord[]; tigerAuditEvents: any[] } }>(
      '/api/sandbox/verifications'
    ),

  verifyPAN: (payload: PANVerificationPayload) =>
    client.post<SandboxVerificationResponse<NormalizedPANData>>('/api/sandbox/pan/verify', payload),

  verifyGST: (payload: GSTVerificationPayload) =>
    client.post<SandboxVerificationResponse<NormalizedGSTData>>('/api/sandbox/gst/verify', payload),

  verifyBankAccount: (payload: BankAccountVerificationPayload) =>
    client.post<SandboxVerificationResponse<NormalizedBankData>>('/api/sandbox/bank-account/verify', payload),
};

export default sandboxApi;
