import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

export interface SandboxAuthConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  apiVersion: string;
}

export interface PANVerificationInput {
  pan: string;
  nameAsPerPan?: string;
  dateOfBirth?: string; // DD/MM/YYYY
}

export interface NormalizedPANResult {
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

export interface GSTVerificationInput {
  gstin: string;
}

export interface NormalizedGSTResult {
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

export interface BankAccountVerificationInput {
  accountNumber: string;
  ifsc: string;
}

export interface NormalizedBankResult {
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

export interface SandboxErrorDetails {
  code: string;
  message: string;
  status: number;
}

export class SandboxService {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private apiVersion: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private isAuthenticating: boolean = false;

  constructor() {
    this.baseUrl = (process.env.SANDBOX_BASE_URL || 'https://test-api.sandbox.co.in').replace(/\/+$/, '');
    this.apiKey = process.env.SANDBOX_API_KEY || '';
    this.apiSecret = process.env.SANDBOX_API_SECRET || '';
    this.apiVersion = process.env.SANDBOX_API_VERSION || '1.0.0';
  }

  /**
   * Helper to check whether real credentials are provided or if in test mock mode
   */
  public isLiveSandboxConfigured(): boolean {
    return Boolean(
      this.apiKey &&
      this.apiSecret &&
      !this.apiKey.includes('your_test_') &&
      !this.apiSecret.includes('your_test_') &&
      this.apiKey.trim().length > 6
    );
  }

  /**
   * Mask sensitive identifier strings (PAN, Bank Account, GSTIN)
   */
  public maskIdentifier(val: string, type: 'PAN' | 'GST' | 'BANK'): string {
    const clean = val.trim().toUpperCase();
    if (type === 'PAN') {
      if (clean.length === 10) {
        return `${clean.slice(0, 3)}****${clean.slice(7)}`;
      }
      return clean.slice(-4).padStart(clean.length, '*');
    }
    if (type === 'GST') {
      if (clean.length === 15) {
        return `${clean.slice(0, 4)}******${clean.slice(10)}`;
      }
      return clean.slice(-4).padStart(clean.length, '*');
    }
    if (type === 'BANK') {
      const last4 = clean.slice(-4);
      return `•••• •••• ${last4}`;
    }
    return clean;
  }

  /**
   * Authenticates against Sandbox.co.in /authenticate endpoint.
   * Caches token for 24 hours (with safe buffer).
   */
  public async authenticate(forceRefresh: boolean = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && this.cachedToken && this.tokenExpiresAt > now) {
      return this.cachedToken;
    }

    if (!this.isLiveSandboxConfigured()) {
      // Mock Sandbox token mode for development and local testing
      this.cachedToken = `sbx_test_jwt_${crypto.randomBytes(16).toString('hex')}`;
      this.tokenExpiresAt = now + 24 * 60 * 60 * 1000 - 300000;
      return this.cachedToken;
    }

    try {
      const authUrl = `${this.baseUrl}/authenticate`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'x-api-secret': this.apiSecret,
          'x-api-version': this.apiVersion,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`⚠️ [Sandbox Service] Auth failed with status ${response.status}`);
        throw new Error(`SANDBOX_AUTH_FAILED: HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      const token = data?.access_token || data?.data?.access_token || data?.token;

      if (!token) {
        throw new Error('SANDBOX_INVALID_AUTH_RESPONSE: Missing access_token');
      }

      this.cachedToken = token;
      // Valid for 24 hours, refresh 5 minutes early
      this.tokenExpiresAt = now + 23.9 * 60 * 60 * 1000;
      return token;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('SANDBOX_TIMEOUT: Authentication timed out after 10s');
      }
      throw err;
    }
  }

  /**
   * Low-level authenticated request handler
   */
  private async request<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT';
      body?: Record<string, any>;
      headers?: Record<string, string>;
      timeoutMs?: number;
    } = {}
  ): Promise<T> {
    const token = await this.authenticate();
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const timeoutMs = options.timeoutMs || 10000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'authorization': token, // Raw token string, NOT 'Bearer <token>' per docs
          'x-api-version': this.apiVersion,
          'x-accept-cache': 'true',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        // Token may have expired prematurely; clear cache and try once
        this.cachedToken = null;
        const freshToken = await this.authenticate(true);
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), timeoutMs);

        const retryResponse = await fetch(url, {
          method: options.method || 'GET',
          headers: {
            'x-api-key': this.apiKey,
            'authorization': freshToken,
            'x-api-version': this.apiVersion,
            'x-accept-cache': 'true',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(options.headers || {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: retryController.signal,
        });

        clearTimeout(retryTimeout);

        if (!retryResponse.ok) {
          throw await this.handleErrorResponse(retryResponse);
        }
        return (await retryResponse.json()) as T;
      }

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutError: any = new Error('SANDBOX_TIMEOUT: Request timed out');
        timeoutError.statusCode = 504;
        timeoutError.code = 'SANDBOX_TIMEOUT';
        throw timeoutError;
      }
      throw err;
    }
  }

  private async handleErrorResponse(response: Response): Promise<Error> {
    let errorBody: any = null;
    try {
      errorBody = await response.json();
    } catch {
      // not JSON
    }

    const error: any = new Error(
      errorBody?.message || errorBody?.error?.message || `Sandbox API error (HTTP ${response.status})`
    );
    error.statusCode = response.status;
    error.code = errorBody?.code || errorBody?.error?.code || `HTTP_${response.status}`;
    error.details = errorBody;
    return error;
  }

  /**
   * PAN Verification API
   * Official Endpoint: POST /kyc/pan/verify or POST /kyc/pan
   */
  public async verifyPAN(input: PANVerificationInput): Promise<NormalizedPANResult> {
    const rawPan = (input.pan || '').trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(rawPan)) {
      const err: any = new Error('Invalid PAN format. PAN must be 10 alphanumeric characters (e.g., ABCDE1234F).');
      err.statusCode = 400;
      err.code = 'INVALID_PAN_FORMAT';
      throw err;
    }

    const maskedIdentifier = this.maskIdentifier(rawPan, 'PAN');
    const now = new Date().toISOString();

    // In mock mode (development or test keys)
    if (!this.isLiveSandboxConfigured()) {
      const isInvalidTestPan = rawPan.startsWith('INV') || rawPan === 'XXXXX0000X';
      const refId = `sbx_ref_pan_${crypto.randomBytes(6).toString('hex')}`;

      if (isInvalidTestPan) {
        return {
          success: false,
          status: 'FAILED',
          verificationType: 'PAN',
          maskedIdentifier,
          category: 'individual',
          nameMatched: false,
          referenceId: refId,
          provider: 'SANDBOX',
          message: 'Invalid PAN details or PAN not found in government database.',
          verifiedAt: now,
        };
      }

      return {
        success: true,
        status: 'VERIFIED',
        verificationType: 'PAN',
        maskedIdentifier,
        category: 'individual',
        nameMatched: Boolean(input.nameAsPerPan),
        nameAsPerPan: input.nameAsPerPan || 'TEST VERIFIED CITIZEN',
        aadhaarSeedingStatus: 'y',
        referenceId: refId,
        provider: 'SANDBOX',
        message: 'PAN verification successful.',
        verifiedAt: now,
      };
    }

    // Live Sandbox Test API call
    try {
      const body = {
        '@entity': 'in.co.sandbox.kyc.pan_verification.request',
        pan: rawPan,
        name_as_per_pan: input.nameAsPerPan || undefined,
        date_of_birth: input.dateOfBirth || undefined,
        consent: 'Y',
        reason: 'Customer onboarding and credit eligibility verification for CrediMerge',
      };

      const result = await this.request<any>('/kyc/pan/verify', {
        method: 'POST',
        body,
      });

      const data = result?.data || result;
      const isValid = (data?.status || '').toLowerCase() === 'valid';

      return {
        success: isValid,
        status: isValid ? 'VERIFIED' : 'FAILED',
        verificationType: 'PAN',
        maskedIdentifier,
        category: data?.category || 'individual',
        nameMatched: Boolean(data?.name_as_per_pan_match ?? true),
        nameAsPerPan: data?.name_as_per_pan,
        aadhaarSeedingStatus: data?.aadhaar_seeding_status,
        referenceId: result?.transaction_id || `sbx_pan_${Date.now()}`,
        provider: 'SANDBOX',
        message: isValid ? 'PAN verification successful.' : (data?.remarks || 'PAN could not be verified.'),
        verifiedAt: now,
      };
    } catch (err: any) {
      console.warn('⚠️ [Sandbox Service] Live PAN verification failed:', err.message);
      throw err;
    }
  }

  /**
   * GSTIN Verification API
   * Official Endpoint: POST /gst/compliance/public/gstin/verify
   */
  public async verifyGST(input: GSTVerificationInput): Promise<NormalizedGSTResult> {
    const rawGst = (input.gstin || '').trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(rawGst)) {
      const err: any = new Error('Invalid GSTIN format. Must be 15 alphanumeric characters (e.g., 29AAAAA0000A1Z5).');
      err.statusCode = 400;
      err.code = 'INVALID_GSTIN_FORMAT';
      throw err;
    }

    const maskedIdentifier = this.maskIdentifier(rawGst, 'GST');
    const now = new Date().toISOString();

    if (!this.isLiveSandboxConfigured()) {
      const isInvalidGst = rawGst.startsWith('00') || rawGst.includes('XXXX');
      const refId = `sbx_ref_gst_${crypto.randomBytes(6).toString('hex')}`;

      if (isInvalidGst) {
        return {
          success: false,
          status: 'FAILED',
          verificationType: 'GST',
          maskedIdentifier,
          taxpayerStatus: 'Cancelled / Inactive',
          referenceId: refId,
          provider: 'SANDBOX',
          message: 'GSTIN not found or registration is cancelled.',
          verifiedAt: now,
        };
      }

      return {
        success: true,
        status: 'VERIFIED',
        verificationType: 'GST',
        maskedIdentifier,
        legalName: 'CREDIMERGE TEST ENTERPRISES PVT LTD',
        tradeName: 'CrediMerge Tech Solutions',
        taxpayerStatus: 'Active',
        constitution: 'Private Limited Company',
        referenceId: refId,
        provider: 'SANDBOX',
        message: 'GSTIN verification successful.',
        verifiedAt: now,
      };
    }

    try {
      const body = { gstin: rawGst };
      const result = await this.request<any>('/gst/compliance/public/gstin/verify', {
        method: 'POST',
        body,
      });

      const data = result?.data || result;
      const isActive = (data?.status || data?.sts || '').toLowerCase() === 'active';

      return {
        success: isActive,
        status: isActive ? 'VERIFIED' : 'FAILED',
        verificationType: 'GST',
        maskedIdentifier,
        legalName: data?.legal_name || data?.lgnm,
        tradeName: data?.trade_name || data?.tradeNam,
        taxpayerStatus: data?.status || data?.sts || 'Unknown',
        constitution: data?.constitution_of_business || data?.ctb,
        referenceId: result?.transaction_id || `sbx_gst_${Date.now()}`,
        provider: 'SANDBOX',
        message: isActive ? 'GSTIN verification successful.' : 'GSTIN inactive or invalid.',
        verifiedAt: now,
      };
    } catch (err: any) {
      console.warn('⚠️ [Sandbox Service] Live GST verification failed:', err.message);
      throw err;
    }
  }

  /**
   * Bank Account Verification API (Penny Drop / Penniless)
   * Official Endpoint: GET /bank/{ifsc}/accounts/{account_number}/verify
   */
  public async verifyBankAccount(input: BankAccountVerificationInput): Promise<NormalizedBankResult> {
    const rawAccount = (input.accountNumber || '').trim().replace(/\s+/g, '');
    const rawIfsc = (input.ifsc || '').trim().toUpperCase();

    if (!/^\d{9,18}$/.test(rawAccount)) {
      const err: any = new Error('Invalid account number. Must be 9 to 18 digits.');
      err.statusCode = 400;
      err.code = 'INVALID_ACCOUNT_NUMBER';
      throw err;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(rawIfsc)) {
      const err: any = new Error('Invalid IFSC code. Format: 4 letters, 0, then 6 alphanumeric characters (e.g. HDFC0000001).');
      err.statusCode = 400;
      err.code = 'INVALID_IFSC_CODE';
      throw err;
    }

    const maskedIdentifier = this.maskIdentifier(rawAccount, 'BANK');
    const now = new Date().toISOString();

    if (!this.isLiveSandboxConfigured()) {
      const isInvalidBank = rawAccount.startsWith('0000') || rawAccount === '1111111111';
      const refId = `sbx_ref_bank_${crypto.randomBytes(6).toString('hex')}`;

      if (isInvalidBank) {
        return {
          success: false,
          status: 'FAILED',
          verificationType: 'BANK_ACCOUNT',
          maskedIdentifier,
          ifsc: rawIfsc,
          accountExists: false,
          referenceId: refId,
          provider: 'SANDBOX',
          message: 'Account does not exist or beneficiary bank rejected verification.',
          verifiedAt: now,
        };
      }

      return {
        success: true,
        status: 'VERIFIED',
        verificationType: 'BANK_ACCOUNT',
        maskedIdentifier,
        ifsc: rawIfsc,
        accountHolderName: 'CREDIMERGE VERIFIED ACCOUNT HOLDER',
        accountExists: true,
        referenceId: refId,
        provider: 'SANDBOX',
        message: 'Bank account verified successfully via Penny Drop.',
        verifiedAt: now,
      };
    }

    try {
      const endpoint = `/bank/${encodeURIComponent(rawIfsc)}/accounts/${encodeURIComponent(rawAccount)}/verify`;
      const result = await this.request<any>(endpoint, {
        method: 'GET',
      });

      const data = result?.data || result;
      const accountExists = Boolean(data?.account_exists ?? true);
      const isSuccess = result?.code === 200 || accountExists;

      return {
        success: isSuccess,
        status: isSuccess ? 'VERIFIED' : 'FAILED',
        verificationType: 'BANK_ACCOUNT',
        maskedIdentifier,
        ifsc: rawIfsc,
        accountHolderName: data?.name_at_bank || data?.beneficiary_name || data?.account_holder_name,
        accountExists,
        referenceId: result?.transaction_id || `sbx_bank_${Date.now()}`,
        provider: 'SANDBOX',
        message: isSuccess ? 'Bank account verified successfully.' : 'Unable to verify bank account.',
        verifiedAt: now,
      };
    } catch (err: any) {
      console.warn('⚠️ [Sandbox Service] Live bank verification failed:', err.message);
      throw err;
    }
  }
}

export const sandboxService = new SandboxService();
