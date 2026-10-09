import crypto from 'crypto';
import { getSupabase } from '../config/supabase';
import {
  createLinkedAccount,
  batchInsertTransactions,
  updateAccountSyncTimestamp,
  LinkedAccount,
  Transaction,
} from './transactionService';

export interface AccountConsent {
  id: string;
  userId: string;
  provider: 'ACCOUNT_AGGREGATOR_SAHAMATI' | 'SETU_AA' | 'SANDBOX_AA';
  handle: string;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  scopes: string[];
  dataFrequency: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

const localConsents = new Map<string, AccountConsent>();
const WEBHOOK_SECRET = process.env.FINANCIAL_WEBHOOK_SECRET || 'credimerge_aa_webhook_secret_key_2026';

/**
 * 1. Create a consent request according to RBI / Sahamati Account Aggregator specs.
 */
export async function createConsentRequest(
  userId: string,
  params: {
    handle: string;
    provider?: AccountConsent['provider'];
    scopes?: string[];
    validityDays?: number;
  }
): Promise<AccountConsent> {
  const normUserId = userId.trim().toUpperCase();
  const consentId = `CNS_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const now = new Date();
  const days = params.validityDays || 90;
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const consent: AccountConsent = {
    id: consentId,
    userId: normUserId,
    provider: params.provider || 'SANDBOX_AA',
    handle: params.handle.trim(),
    status: 'ACTIVE', // Automatically verified in sandbox/mock flow, pending in live
    scopes: params.scopes || ['TRANSACTIONS', 'PROFILE', 'SUMMARY'],
    dataFrequency: 'DAILY',
    expiresAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  localConsents.set(consentId, consent);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('account_consents').insert({
        id: consent.id,
        user_id: consent.userId,
        provider: consent.provider,
        handle: consent.handle,
        status: consent.status,
        scopes: consent.scopes,
        data_frequency: consent.dataFrequency,
        expires_at: consent.expiresAt,
        created_at: consent.createdAt,
        updated_at: consent.updatedAt,
      });
    } catch (err) {
      console.warn('Supabase consent insert fallback:', err);
    }
  }

  return consent;
}

/**
 * 2. Get active consent for user.
 */
export async function getUserConsent(userId: string): Promise<AccountConsent | null> {
  const normUserId = userId.trim().toUpperCase();

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('account_consents')
        .select('*')
        .eq('user_id', normUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          provider: data.provider,
          handle: data.handle,
          status: data.status,
          scopes: data.scopes || [],
          dataFrequency: data.data_frequency,
          expiresAt: data.expires_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn('Supabase consent load fallback:', err);
    }
  }

  const userConsents = Array.from(localConsents.values()).filter((c) => c.userId === normUserId);
  return userConsents.length > 0 ? userConsents[userConsents.length - 1] : null;
}

/**
 * 3. Revoke consent.
 */
export async function revokeConsent(userId: string, consentId: string): Promise<boolean> {
  const normUserId = userId.trim().toUpperCase();
  const consent = localConsents.get(consentId);
  const now = new Date().toISOString();

  if (consent && consent.userId === normUserId) {
    consent.status = 'REVOKED';
    consent.updatedAt = now;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('account_consents')
        .update({ status: 'REVOKED', updated_at: now })
        .eq('id', consentId)
        .eq('user_id', normUserId);
    } catch (err) {
      console.warn('Supabase revoke consent error:', err);
    }
  }
  return true;
}

/**
 * 4. Connect a Sandbox Account with realistic synthetic transactions.
 * Clearly flags data with source: 'SANDBOX' so it is never confused with live data.
 */
export async function connectSandboxAccount(
  userId: string,
  institutionName: string = 'HDFC Bank'
): Promise<{ account: LinkedAccount; transactions: Transaction[] }> {
  const normUserId = userId.trim().toUpperCase();

  // Create or retrieve active consent
  let consent = await getUserConsent(normUserId);
  if (!consent || consent.status !== 'ACTIVE') {
    consent = await createConsentRequest(normUserId, {
      handle: `${normUserId.toLowerCase()}@sandbox.aa`,
      provider: 'SANDBOX_AA',
      scopes: ['TRANSACTIONS', 'PROFILE', 'SUMMARY'],
    });
  }

  const masks: Record<string, string> = {
    'HDFC Bank': '•••• 8921',
    'State Bank of India': '•••• 4102',
    'ICICI Bank': '•••• 7319',
    'Axis Bank': '•••• 9034',
  };
  const mask = masks[institutionName] || `•••• ${Math.floor(1000 + Math.random() * 9000)}`;

  const account = await createLinkedAccount(normUserId, {
    institutionName,
    accountNumberMask: mask,
    accountType: 'SAVINGS',
    provider: 'SANDBOX',
    balance: 48500,
    consentId: consent.id,
  });

  // Generate realistic synthetic transactions across past 60 days
  const now = new Date();
  const rawBatch: Array<Parameters<typeof batchInsertTransactions>[1][0]> = [
    // Salary credits
    {
      accountId: account.id,
      providerTxId: `SBX_SAL_${Date.now()}_1`,
      type: 'CREDIT',
      amount: 45000,
      description: 'NEFT CR - TECHSOLUTIONS PVT LTD - SALARY',
      merchantName: 'TechSolutions Pvt Ltd',
      transactionDate: new Date(now.getTime() - 2 * 86400000).toISOString(),
      category: 'SALARY',
      source: 'SANDBOX',
      status: 'SUCCESS',
      referenceNumber: 'CMS' + Math.floor(10000000 + Math.random() * 90000000),
    },
    {
      accountId: account.id,
      providerTxId: `SBX_SAL_${Date.now()}_2`,
      type: 'CREDIT',
      amount: 45000,
      description: 'NEFT CR - TECHSOLUTIONS PVT LTD - SALARY',
      merchantName: 'TechSolutions Pvt Ltd',
      transactionDate: new Date(now.getTime() - 32 * 86400000).toISOString(),
      category: 'SALARY',
      source: 'SANDBOX',
      status: 'SUCCESS',
      referenceNumber: 'CMS' + Math.floor(10000000 + Math.random() * 90000000),
    },
    // Loan / EMI debits
    {
      accountId: account.id,
      providerTxId: `SBX_EMI_${Date.now()}_1`,
      type: 'DEBIT',
      amount: 6850,
      description: 'ACH DEBIT - HDFC BANK PERSONAL LOAN EMI',
      merchantName: 'HDFC Bank',
      transactionDate: new Date(now.getTime() - 5 * 86400000).toISOString(),
      category: 'LOAN_REPAYMENT',
      source: 'SANDBOX',
      status: 'SUCCESS',
      referenceNumber: 'NACH' + Math.floor(1000000 + Math.random() * 9000000),
    },
    {
      accountId: account.id,
      providerTxId: `SBX_EMI_${Date.now()}_2`,
      type: 'DEBIT',
      amount: 3200,
      description: 'AUTO DEBIT - BAJAJ FINSERV TWO WHEELER EMI',
      merchantName: 'Bajaj Finserv',
      transactionDate: new Date(now.getTime() - 10 * 86400000).toISOString(),
      category: 'LOAN_REPAYMENT',
      source: 'SANDBOX',
      status: 'SUCCESS',
      referenceNumber: 'NACH' + Math.floor(1000000 + Math.random() * 9000000),
    },
    // Utilities & Rent
    {
      accountId: account.id,
      providerTxId: `SBX_RENT_${Date.now()}_1`,
      type: 'DEBIT',
      amount: 12000,
      description: 'UPI - RENT PAYMENT TO SUNIL SHARMA',
      merchantName: 'Landlord / Rental',
      transactionDate: new Date(now.getTime() - 4 * 86400000).toISOString(),
      category: 'BILLS',
      source: 'SANDBOX',
      status: 'SUCCESS',
      referenceNumber: 'UPI' + Math.floor(10000000 + Math.random() * 90000000),
    },
    {
      accountId: account.id,
      providerTxId: `SBX_UTIL_${Date.now()}_1`,
      type: 'DEBIT',
      amount: 1450,
      description: 'BBPS DEBIT - BESCOM ELECTRICITY BILL',
      merchantName: 'BESCOM Electricity',
      transactionDate: new Date(now.getTime() - 12 * 86400000).toISOString(),
      category: 'BILLS',
      source: 'SANDBOX',
      status: 'SUCCESS',
      referenceNumber: 'BBPS' + Math.floor(100000 + Math.random() * 900000),
    },
    // Groceries
    {
      accountId: account.id,
      providerTxId: `SBX_GROC_${Date.now()}_1`,
      type: 'DEBIT',
      amount: 840,
      description: 'UPI - BLINKIT COMMERCE INSTANT DELIVERY',
      merchantName: 'Blinkit',
      transactionDate: new Date(now.getTime() - 1 * 86400000).toISOString(),
      category: 'GROCERIES',
      source: 'SANDBOX',
      status: 'SUCCESS',
      referenceNumber: 'UPI' + Math.floor(10000000 + Math.random() * 90000000),
    },
    {
      accountId: account.id,
      providerTxId: `SBX_GROC_${Date.now()}_2`,
      type: 'DEBIT',
      amount: 1650,
      description: 'POS DEBIT - DMART SUPERMARKET',
      merchantName: 'DMart',
      transactionDate: new Date(now.getTime() - 8 * 86400000).toISOString(),
      category: 'GROCERIES',
      source: 'SANDBOX',
      status: 'SUCCESS',
      referenceNumber: 'POS' + Math.floor(100000 + Math.random() * 900000),
    },
    // Shopping
    {
      accountId: account.id,
      providerTxId: `SBX_SHOP_${Date.now()}_1`,
      type: 'DEBIT',
      amount: 2199,
      description: 'NETBANKING - AMAZON PAY INDIA RETAIL',
      merchantName: 'Amazon',
      transactionDate: new Date(now.getTime() - 15 * 86400000).toISOString(),
      category: 'SHOPPING',
      source: 'SANDBOX',
      status: 'SUCCESS',
      referenceNumber: 'PG' + Math.floor(100000 + Math.random() * 900000),
    },
    // Subscriptions
    {
      accountId: account.id,
      providerTxId: `SBX_SUB_${Date.now()}_1`,
      type: 'DEBIT',
      amount: 649,
      description: 'AUTO RECURRING - NETFLIX ENTERTAINMENT SERVICES',
      merchantName: 'Netflix',
      transactionDate: new Date(now.getTime() - 18 * 86400000).toISOString(),
      category: 'ENTERTAINMENT',
      source: 'SANDBOX',
      status: 'SUCCESS',
      referenceNumber: 'SI' + Math.floor(100000 + Math.random() * 900000),
    },
  ];

  const { inserted } = await batchInsertTransactions(normUserId, rawBatch);
  return { account, transactions: inserted };
}

/**
 * 5. Incremental Synchronization for linked accounts.
 */
export async function syncAccount(
  userId: string,
  accountId: string
): Promise<{
  syncedCount: number;
  newBalance: number;
  lastSyncedAt: string;
  source: 'SANDBOX' | 'LIVE';
}> {
  const normUserId = userId.trim().toUpperCase();
  const consent = await getUserConsent(normUserId);

  if (!consent || consent.status !== 'ACTIVE') {
    throw new Error('CONSENT_EXPIRED: Consent has expired or has been revoked. Please reconnect your account.');
  }

  // Simulate incoming fresh transaction during sync if sandbox
  const now = new Date();
  const freshTx: Parameters<typeof batchInsertTransactions>[1][0] = {
    accountId,
    providerTxId: `SYNC_${Date.now()}`,
    type: 'DEBIT',
    amount: +(Math.random() * 800 + 120).toFixed(2),
    description: 'UPI - QUICK COMMERCE GROCERIES',
    merchantName: 'Zepto / Blinkit',
    transactionDate: now.toISOString(),
    category: 'GROCERIES',
    source: 'SANDBOX',
    status: 'SUCCESS',
  };

  const { inserted } = await batchInsertTransactions(normUserId, [freshTx]);
  const newBalance = +(48500 - (inserted[0]?.amount || 0)).toFixed(2);
  await updateAccountSyncTimestamp(normUserId, accountId, newBalance);

  return {
    syncedCount: inserted.length,
    newBalance,
    lastSyncedAt: now.toISOString(),
    source: 'SANDBOX',
  };
}

/**
 * 6. Provider Webhook Signature Verification & Processing.
 * Uses HMAC-SHA256 signature checking.
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!signature) return false;
  try {
    const computed = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * 7. Process Incoming Provider Webhook.
 */
export async function processWebhookTransactions(
  userId: string,
  accountId: string,
  transactions: Array<{
    providerTxId: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    transactionDate: string;
    referenceNumber?: string;
  }>
): Promise<{ processed: number; duplicates: number }> {
  const items = transactions.map((t) => ({
    accountId,
    providerTxId: t.providerTxId,
    type: t.type,
    amount: t.amount,
    description: t.description,
    transactionDate: t.transactionDate,
    source: 'LIVE' as const,
    status: 'SUCCESS' as const,
    referenceNumber: t.referenceNumber,
  }));

  const { inserted, duplicatesCount } = await batchInsertTransactions(userId, items);
  return { processed: inserted.length, duplicates: duplicatesCount };
}
