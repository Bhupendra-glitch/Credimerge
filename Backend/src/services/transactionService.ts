import crypto from 'crypto';
import { getSupabase } from '../config/supabase';

export type TransactionType = 'CREDIT' | 'DEBIT';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'REVERSED' | 'FAILED';
export type TransactionSource = 'LIVE' | 'SANDBOX' | 'IMPORTED' | 'MANUAL';
export type TransactionCategory =
  | 'SALARY'
  | 'GROCERIES'
  | 'SHOPPING'
  | 'BILLS'
  | 'LOAN_REPAYMENT'
  | 'TRANSFER'
  | 'INVESTMENT'
  | 'MEDICAL'
  | 'ENTERTAINMENT'
  | 'OTHER';

export interface LinkedAccount {
  id: string;
  userId: string;
  consentId?: string | null;
  institutionName: string;
  accountNumberMask: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'CREDIT_CARD' | 'LOAN';
  provider: 'ACCOUNT_AGGREGATOR' | 'SETU' | 'SANDBOX' | 'MANUAL';
  connectionStatus: 'CONNECTED' | 'SYNCING' | 'DISCONNECTED' | 'CONSENT_EXPIRED';
  balance: number;
  currency: string;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId?: string | null;
  providerTxId?: string | null;
  idempotencyHash: string;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  categoryConfidence: number;
  isUserConfirmedCategory: boolean;
  description: string;
  merchantName?: string | null;
  transactionDate: string;
  status: TransactionStatus;
  source: TransactionSource;
  referenceNumber?: string | null;
  isRecurring?: boolean;
  recurringObligationType?: 'EMI' | 'SUBSCRIPTION' | 'RENT' | 'UTILITY' | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilter {
  type?: TransactionType | 'ALL';
  category?: TransactionCategory | 'ALL';
  status?: TransactionStatus | 'ALL';
  source?: TransactionSource | 'ALL';
  search?: string;
  startDate?: string;
  endDate?: string;
  accountId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'transactionDate' | 'amount';
  sortOrder?: 'ASC' | 'DESC';
}

export interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netCashFlow: number;
  monthlySpending: number;
  categoryBreakdown: Record<TransactionCategory, number>;
  monthlyTrends: Array<{
    month: string;
    credits: number;
    debits: number;
    net: number;
  }>;
  recentTransactions: Transaction[];
  upcomingObligations: Array<{
    type: string;
    description: string;
    estimatedAmount: number;
    frequency: string;
    nextExpectedDate?: string;
  }>;
}

// In-memory caching & fallback store
const localAccounts = new Map<string, LinkedAccount>(); // accountId -> LinkedAccount
const localTransactions = new Map<string, Transaction>(); // transactionId -> Transaction
const idempotencyRegistry = new Set<string>(); // idempotencyHash set

/**
 * Compute stable SHA-256 idempotency hash for a transaction.
 */
export function computeIdempotencyHash(input: {
  userId: string;
  accountId?: string | null;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description: string;
  providerTxId?: string | null;
}): string {
  if (input.providerTxId && input.providerTxId.trim().length > 0) {
    return crypto
      .createHash('sha256')
      .update(`PROV:${input.userId}:${input.providerTxId.trim()}`)
      .digest('hex');
  }

  // Normalize date to YYYY-MM-DD
  const dateKey = new Date(input.transactionDate).toISOString().split('T')[0];
  const normalizedDesc = input.description.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedAmount = Number(input.amount).toFixed(2);
  const normalizedAccount = input.accountId || 'NONE';

  const rawKey = `${input.userId}|${normalizedAccount}|${input.type}|${normalizedAmount}|${dateKey}|${normalizedDesc}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Categorize a transaction based on description, merchant, and amount.
 */
export function autoCategorize(
  description: string,
  type: TransactionType
): {
  category: TransactionCategory;
  confidence: number;
  merchantName: string;
  isRecurring: boolean;
  recurringObligationType: 'EMI' | 'SUBSCRIPTION' | 'RENT' | 'UTILITY' | null;
} {
  const desc = description.toLowerCase();

  // Salary / Income
  if (
    type === 'CREDIT' &&
    (desc.includes('salary') ||
      desc.includes('payroll') ||
      desc.includes('neft cr-') ||
      desc.includes('stipend') ||
      desc.includes('wages') ||
      desc.includes('infosys') ||
      desc.includes('tcs') ||
      desc.includes('wipro') ||
      desc.includes('swiggy partner') ||
      desc.includes('zomato payout'))
  ) {
    return {
      category: 'SALARY',
      confidence: 0.95,
      merchantName: 'Employer / Payout Partner',
      isRecurring: true,
      recurringObligationType: null,
    };
  }

  // Loan Repayments & EMIs
  if (
    type === 'DEBIT' &&
    (desc.includes('emi') ||
      desc.includes('loan') ||
      desc.includes('nach') ||
      desc.includes('hdfc bank loan') ||
      desc.includes('bajaj finserv') ||
      desc.includes('tata capital') ||
      desc.includes('kreditbee') ||
      desc.includes('credit card bill') ||
      desc.includes('sbi cards') ||
      desc.includes('icici bank emi') ||
      desc.includes('home loan') ||
      desc.includes('auto loan'))
  ) {
    let merchant = 'Financial Institution';
    if (desc.includes('hdfc')) merchant = 'HDFC Bank';
    else if (desc.includes('bajaj')) merchant = 'Bajaj Finserv';
    else if (desc.includes('tata')) merchant = 'Tata Capital';
    else if (desc.includes('sbi')) merchant = 'SBI Cards';
    else if (desc.includes('icici')) merchant = 'ICICI Bank';

    return {
      category: 'LOAN_REPAYMENT',
      confidence: 0.94,
      merchantName: merchant,
      isRecurring: true,
      recurringObligationType: 'EMI',
    };
  }

  // Utility Bills & Rent
  if (
    type === 'DEBIT' &&
    (desc.includes('electricity') ||
      desc.includes('bescom') ||
      desc.includes('tneb') ||
      desc.includes('water bill') ||
      desc.includes('gas bill') ||
      desc.includes('airtel') ||
      desc.includes('jio fiber') ||
      desc.includes('broadband') ||
      desc.includes('rent') ||
      desc.includes('society maintenance'))
  ) {
    const isRent = desc.includes('rent');
    return {
      category: 'BILLS',
      confidence: 0.92,
      merchantName: isRent ? 'Landlord / Rental' : 'Utility Provider',
      isRecurring: true,
      recurringObligationType: isRent ? 'RENT' : 'UTILITY',
    };
  }

  // Groceries & Food
  if (
    desc.includes('blinkit') ||
    desc.includes('zepto') ||
    desc.includes('swiggy instamart') ||
    desc.includes('bigbasket') ||
    desc.includes('dmart') ||
    desc.includes('supermarket') ||
    desc.includes('grocery') ||
    desc.includes('milk') ||
    desc.includes('nature basket')
  ) {
    return {
      category: 'GROCERIES',
      confidence: 0.91,
      merchantName: desc.includes('blinkit')
        ? 'Blinkit'
        : desc.includes('zepto')
        ? 'Zepto'
        : desc.includes('bigbasket')
        ? 'BigBasket'
        : 'Grocery Merchant',
      isRecurring: false,
      recurringObligationType: null,
    };
  }

  // Shopping & E-commerce
  if (
    desc.includes('amazon') ||
    desc.includes('flipkart') ||
    desc.includes('myntra') ||
    desc.includes('ajio') ||
    desc.includes('zara') ||
    desc.includes('retail') ||
    desc.includes('nykaa')
  ) {
    return {
      category: 'SHOPPING',
      confidence: 0.89,
      merchantName: desc.includes('amazon')
        ? 'Amazon'
        : desc.includes('flipkart')
        ? 'Flipkart'
        : 'Retailer',
      isRecurring: false,
      recurringObligationType: null,
    };
  }

  // Subscriptions & Entertainment
  if (
    desc.includes('netflix') ||
    desc.includes('spotify') ||
    desc.includes('youtube prem') ||
    desc.includes('hotstar') ||
    desc.includes('prime video') ||
    desc.includes('bookmyshow') ||
    desc.includes('pvr')
  ) {
    const isSub =
      desc.includes('netflix') ||
      desc.includes('spotify') ||
      desc.includes('hotstar') ||
      desc.includes('prime');
    return {
      category: 'ENTERTAINMENT',
      confidence: 0.93,
      merchantName: desc.includes('netflix')
        ? 'Netflix'
        : desc.includes('spotify')
        ? 'Spotify'
        : 'Entertainment',
      isRecurring: isSub,
      recurringObligationType: isSub ? 'SUBSCRIPTION' : null,
    };
  }

  // Medical & Healthcare
  if (
    desc.includes('pharmacy') ||
    desc.includes('apollo') ||
    desc.includes('1mg') ||
    desc.includes('hospital') ||
    desc.includes('dr.') ||
    desc.includes('medplus')
  ) {
    return {
      category: 'MEDICAL',
      confidence: 0.88,
      merchantName: 'Healthcare Provider',
      isRecurring: false,
      recurringObligationType: null,
    };
  }

  // Investments
  if (
    desc.includes('zerodha') ||
    desc.includes('groww') ||
    desc.includes('mutual fund') ||
    desc.includes('sip') ||
    desc.includes('kuvera') ||
    desc.includes('coin')
  ) {
    return {
      category: 'INVESTMENT',
      confidence: 0.90,
      merchantName: 'Investment Platform',
      isRecurring: desc.includes('sip'),
      recurringObligationType: null,
    };
  }

  // Bank Transfers & UPI Person-to-Person
  if (desc.includes('upi transfer') || desc.includes('imps') || desc.includes('neft')) {
    return {
      category: 'TRANSFER',
      confidence: 0.75,
      merchantName: 'Transfer Counterparty',
      isRecurring: false,
      recurringObligationType: null,
    };
  }

  return {
    category: 'OTHER',
    confidence: 0.5,
    merchantName: 'Merchant',
    isRecurring: false,
    recurringObligationType: null,
  };
}

/**
 * Record a transaction with strict duplicate prevention and idempotency.
 */
export async function createTransaction(
  userId: string,
  raw: {
    accountId?: string | null;
    providerTxId?: string | null;
    type: TransactionType;
    amount: number;
    category?: TransactionCategory;
    description: string;
    merchantName?: string | null;
    transactionDate: string;
    status?: TransactionStatus;
    source?: TransactionSource;
    referenceNumber?: string | null;
    isUserConfirmedCategory?: boolean;
  }
): Promise<{ transaction: Transaction; isDuplicate: boolean }> {
  const normUserId = userId.trim().toUpperCase();
  const amount = Math.abs(Number(raw.amount || 0));
  const type = raw.type === 'CREDIT' ? 'CREDIT' : 'DEBIT';
  const description = String(raw.description || '').trim();
  const txDate = raw.transactionDate ? new Date(raw.transactionDate).toISOString() : new Date().toISOString();

  // Compute idempotency hash
  const hash = computeIdempotencyHash({
    userId: normUserId,
    accountId: raw.accountId,
    type,
    amount,
    transactionDate: txDate,
    description,
    providerTxId: raw.providerTxId,
  });

  // Check in-memory idempotency registry
  if (idempotencyRegistry.has(hash)) {
    for (const tx of localTransactions.values()) {
      if (tx.idempotencyHash === hash && tx.userId === normUserId) {
        return { transaction: tx, isDuplicate: true };
      }
    }
  }

  // Check database if Supabase is connected
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('transactions')
        .select('*')
        .eq('idempotency_hash', hash)
        .maybeSingle();

      if (existing) {
        const mapped = mapDbToTransaction(existing);
        localTransactions.set(mapped.id, mapped);
        idempotencyRegistry.add(hash);
        return { transaction: mapped, isDuplicate: true };
      }
    } catch (err) {
      console.warn('Supabase idempotency check fallback:', err);
    }
  }

  // Categorize
  const auto = autoCategorize(description, type);
  const category = raw.category || auto.category;
  const merchantName = raw.merchantName || auto.merchantName;
  const isRecurring = auto.isRecurring;
  const recurringObligationType = auto.recurringObligationType;

  const now = new Date().toISOString();
  const id = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const transaction: Transaction = {
    id,
    userId: normUserId,
    accountId: raw.accountId || null,
    providerTxId: raw.providerTxId || null,
    idempotencyHash: hash,
    type,
    amount: +amount.toFixed(2),
    category,
    categoryConfidence: raw.category ? 1.0 : auto.confidence,
    isUserConfirmedCategory: Boolean(raw.isUserConfirmedCategory),
    description,
    merchantName,
    transactionDate: txDate,
    status: raw.status || 'SUCCESS',
    source: raw.source || 'MANUAL',
    referenceNumber: raw.referenceNumber || null,
    isRecurring,
    recurringObligationType,
    createdAt: now,
    updatedAt: now,
  };

  // Save to local cache
  localTransactions.set(id, transaction);
  idempotencyRegistry.add(hash);

  // Persist to Supabase if available
  if (supabase) {
    try {
      const payload = {
        id: transaction.id,
        user_id: transaction.userId,
        account_id: transaction.accountId,
        provider_tx_id: transaction.providerTxId,
        idempotency_hash: transaction.idempotencyHash,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        category_confidence: transaction.categoryConfidence,
        is_user_confirmed_category: transaction.isUserConfirmedCategory,
        description: transaction.description,
        merchant_name: transaction.merchantName,
        transaction_date: transaction.transactionDate,
        status: transaction.status,
        source: transaction.source,
        reference_number: transaction.referenceNumber,
        is_recurring: transaction.isRecurring,
        recurring_obligation_type: transaction.recurringObligationType,
        created_at: transaction.createdAt,
        updated_at: transaction.updatedAt,
      };

      const { error } = await supabase.from('transactions').insert(payload);
      if (error) {
        console.warn('Supabase transaction insert warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase transaction insert error:', err);
    }
  }

  return { transaction, isDuplicate: false };
}

/**
 * Batch insert transactions with duplicate skipping.
 */
export async function batchInsertTransactions(
  userId: string,
  items: Array<Parameters<typeof createTransaction>[1]>
): Promise<{ inserted: Transaction[]; duplicatesCount: number }> {
  const inserted: Transaction[] = [];
  let duplicatesCount = 0;

  for (const item of items) {
    const res = await createTransaction(userId, item);
    if (res.isDuplicate) {
      duplicatesCount += 1;
    } else {
      inserted.push(res.transaction);
    }
  }

  return { inserted, duplicatesCount };
}

/**
 * Query user transactions with filtering, search, sorting and pagination.
 */
export async function getTransactions(
  userId: string,
  filter: TransactionFilter = {}
): Promise<{
  transactions: Transaction[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const normUserId = userId.trim().toUpperCase();
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
  const offset = (page - 1) * limit;

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', normUserId);

      if (filter.type && filter.type !== 'ALL') {
        query = query.eq('type', filter.type);
      }
      if (filter.category && filter.category !== 'ALL') {
        query = query.eq('category', filter.category);
      }
      if (filter.status && filter.status !== 'ALL') {
        query = query.eq('status', filter.status);
      }
      if (filter.source && filter.source !== 'ALL') {
        query = query.eq('source', filter.source);
      }
      if (filter.accountId) {
        query = query.eq('account_id', filter.accountId);
      }
      if (filter.startDate) {
        query = query.gte('transaction_date', new Date(filter.startDate).toISOString());
      }
      if (filter.endDate) {
        query = query.lte('transaction_date', new Date(filter.endDate).toISOString());
      }
      if (filter.search && filter.search.trim()) {
        const s = filter.search.trim();
        query = query.or(`description.ilike.%${s}%,merchant_name.ilike.%${s}%`);
      }

      const sortCol = filter.sortBy === 'amount' ? 'amount' : 'transaction_date';
      const isAsc = filter.sortOrder === 'ASC';
      query = query.order(sortCol, { ascending: isAsc }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (!error && data) {
        const txs = data.map(mapDbToTransaction);
        return {
          transactions: txs,
          totalCount: count || txs.length,
          page,
          limit,
          totalPages: Math.ceil((count || txs.length) / limit) || 1,
        };
      }
    } catch (err) {
      console.warn('Supabase transactions query fallback:', err);
    }
  }

  // In-memory fallback
  let list = Array.from(localTransactions.values()).filter((t) => t.userId === normUserId);

  if (filter.type && filter.type !== 'ALL') {
    list = list.filter((t) => t.type === filter.type);
  }
  if (filter.category && filter.category !== 'ALL') {
    list = list.filter((t) => t.category === filter.category);
  }
  if (filter.status && filter.status !== 'ALL') {
    list = list.filter((t) => t.status === filter.status);
  }
  if (filter.source && filter.source !== 'ALL') {
    list = list.filter((t) => t.source === filter.source);
  }
  if (filter.accountId) {
    list = list.filter((t) => t.accountId === filter.accountId);
  }
  if (filter.startDate) {
    const start = new Date(filter.startDate).getTime();
    list = list.filter((t) => new Date(t.transactionDate).getTime() >= start);
  }
  if (filter.endDate) {
    const end = new Date(filter.endDate).getTime();
    list = list.filter((t) => new Date(t.transactionDate).getTime() <= end);
  }
  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.description.toLowerCase().includes(s) ||
        (t.merchantName && t.merchantName.toLowerCase().includes(s))
    );
  }

  list.sort((a, b) => {
    if (filter.sortBy === 'amount') {
      return filter.sortOrder === 'ASC' ? a.amount - b.amount : b.amount - a.amount;
    }
    const tA = new Date(a.transactionDate).getTime();
    const tB = new Date(b.transactionDate).getTime();
    return filter.sortOrder === 'ASC' ? tA - tB : tB - tA;
  });

  const totalCount = list.length;
  const paged = list.slice(offset, offset + limit);

  return {
    transactions: paged,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

/**
 * Calculate comprehensive summary, credits, debits, cash flow, and categories.
 */
export async function getTransactionSummary(userId: string): Promise<TransactionSummary> {
  const normUserId = userId.trim().toUpperCase();

  // Load all user transactions (unpaginated for accurate summary)
  let all: Transaction[] = [];
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', normUserId)
        .order('transaction_date', { ascending: false });

      if (!error && data) {
        all = data.map(mapDbToTransaction);
      }
    } catch (err) {
      console.warn('Supabase summary load fallback:', err);
    }
  }

  if (all.length === 0) {
    all = Array.from(localTransactions.values())
      .filter((t) => t.userId === normUserId)
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }

  let totalCredits = 0;
  let totalDebits = 0;
  const categoryBreakdown: Record<TransactionCategory, number> = {
    SALARY: 0,
    GROCERIES: 0,
    SHOPPING: 0,
    BILLS: 0,
    LOAN_REPAYMENT: 0,
    TRANSFER: 0,
    INVESTMENT: 0,
    MEDICAL: 0,
    ENTERTAINMENT: 0,
    OTHER: 0,
  };

  const monthMap = new Map<string, { credits: number; debits: number }>();
  const recurringDebits = new Map<string, { amount: number; count: number; desc: string; type: string }>();

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let currentMonthSpending = 0;

  for (const tx of all) {
    if (tx.status === 'FAILED') continue;

    const amt = Number(tx.amount || 0);
    const date = new Date(tx.transactionDate);
    const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthMap.has(mKey)) {
      monthMap.set(mKey, { credits: 0, debits: 0 });
    }
    const mVal = monthMap.get(mKey)!;

    if (tx.type === 'CREDIT') {
      totalCredits += amt;
      mVal.credits += amt;
    } else {
      totalDebits += amt;
      mVal.debits += amt;
      categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + amt;

      if (mKey === currentMonthKey) {
        currentMonthSpending += amt;
      }

      // Track potential recurring obligations
      if (tx.isRecurring && tx.recurringObligationType) {
        const key = `${tx.recurringObligationType}:${tx.merchantName || tx.description}`;
        const existing = recurringDebits.get(key) || {
          amount: amt,
          count: 0,
          desc: tx.description,
          type: tx.recurringObligationType,
        };
        existing.count += 1;
        existing.amount = amt;
        recurringDebits.set(key, existing);
      }
    }
  }

  const monthlyTrends = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      month,
      credits: +data.credits.toFixed(2),
      debits: +data.debits.toFixed(2),
      net: +(data.credits - data.debits).toFixed(2),
    }));

  const upcomingObligations = Array.from(recurringDebits.values()).map((item) => ({
    type: item.type,
    description: item.desc,
    estimatedAmount: +item.amount.toFixed(2),
    frequency: 'Monthly',
    nextExpectedDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
  }));

  return {
    totalCredits: +totalCredits.toFixed(2),
    totalDebits: +totalDebits.toFixed(2),
    netCashFlow: +(totalCredits - totalDebits).toFixed(2),
    monthlySpending: +(currentMonthSpending || totalDebits).toFixed(2),
    categoryBreakdown,
    monthlyTrends,
    recentTransactions: all.slice(0, 10),
    upcomingObligations,
  };
}

/**
 * Update transaction category (allows user confirmation and correction).
 */
export async function updateTransactionCategory(
  userId: string,
  transactionId: string,
  newCategory: TransactionCategory
): Promise<Transaction | null> {
  const normUserId = userId.trim().toUpperCase();

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          category: newCategory,
          is_user_confirmed_category: true,
          category_confidence: 1.0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .eq('user_id', normUserId)
        .select('*')
        .single();

      if (!error && data) {
        const mapped = mapDbToTransaction(data);
        localTransactions.set(mapped.id, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Supabase category update fallback:', err);
    }
  }

  const existing = localTransactions.get(transactionId);
  if (existing && existing.userId === normUserId) {
    existing.category = newCategory;
    existing.isUserConfirmedCategory = true;
    existing.categoryConfidence = 1.0;
    existing.updatedAt = new Date().toISOString();
    localTransactions.set(transactionId, existing);
    return existing;
  }

  return null;
}

/**
 * Delete a transaction.
 */
export async function deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
  const normUserId = userId.trim().toUpperCase();

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', normUserId);

      if (!error) {
        localTransactions.delete(transactionId);
        return true;
      }
    } catch (err) {
      console.warn('Supabase delete transaction fallback:', err);
    }
  }

  const existing = localTransactions.get(transactionId);
  if (existing && existing.userId === normUserId) {
    localTransactions.delete(transactionId);
    return true;
  }
  return false;
}

/**
 * Linked Accounts Management.
 */
export async function createLinkedAccount(
  userId: string,
  accountData: {
    institutionName: string;
    accountNumberMask: string;
    accountType?: LinkedAccount['accountType'];
    provider?: LinkedAccount['provider'];
    balance?: number;
    consentId?: string | null;
  }
): Promise<LinkedAccount> {
  const normUserId = userId.trim().toUpperCase();
  const id = `ACC_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const now = new Date().toISOString();

  const account: LinkedAccount = {
    id,
    userId: normUserId,
    consentId: accountData.consentId || null,
    institutionName: accountData.institutionName,
    accountNumberMask: accountData.accountNumberMask,
    accountType: accountData.accountType || 'SAVINGS',
    provider: accountData.provider || 'SANDBOX',
    connectionStatus: 'CONNECTED',
    balance: Number(accountData.balance || 0),
    currency: 'INR',
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  localAccounts.set(id, account);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('linked_accounts').insert({
        id: account.id,
        user_id: account.userId,
        consent_id: account.consentId,
        institution_name: account.institutionName,
        account_number_mask: account.accountNumberMask,
        account_type: account.accountType,
        provider: account.provider,
        connection_status: account.connectionStatus,
        balance: account.balance,
        currency: account.currency,
        last_synced_at: account.lastSyncedAt,
        created_at: account.createdAt,
        updated_at: account.updatedAt,
      });
    } catch (err) {
      console.warn('Supabase linked account insert error:', err);
    }
  }

  return account;
}

export async function listLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
  const normUserId = userId.trim().toUpperCase();

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('user_id', normUserId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(mapDbToAccount);
      }
    } catch (err) {
      console.warn('Supabase linked accounts query fallback:', err);
    }
  }

  return Array.from(localAccounts.values()).filter((a) => a.userId === normUserId);
}

export async function updateAccountSyncTimestamp(
  userId: string,
  accountId: string,
  balance?: number
): Promise<void> {
  const normUserId = userId.trim().toUpperCase();
  const now = new Date().toISOString();

  const existing = localAccounts.get(accountId);
  if (existing && existing.userId === normUserId) {
    existing.lastSyncedAt = now;
    if (balance !== undefined) existing.balance = balance;
    existing.updatedAt = now;
    localAccounts.set(accountId, existing);
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const updates: Record<string, any> = {
        last_synced_at: now,
        updated_at: now,
      };
      if (balance !== undefined) updates.balance = balance;

      await supabase
        .from('linked_accounts')
        .update(updates)
        .eq('id', accountId)
        .eq('user_id', normUserId);
    } catch (err) {
      console.warn('Supabase account sync update fallback:', err);
    }
  }
}

// Helpers
function mapDbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id || null,
    providerTxId: row.provider_tx_id || null,
    idempotencyHash: row.idempotency_hash,
    type: row.type,
    amount: Number(row.amount || 0),
    category: row.category,
    categoryConfidence: Number(row.category_confidence || 1.0),
    isUserConfirmedCategory: Boolean(row.is_user_confirmed_category),
    description: row.description,
    merchantName: row.merchant_name || null,
    transactionDate: row.transaction_date,
    status: row.status,
    source: row.source,
    referenceNumber: row.reference_number || null,
    isRecurring: Boolean(row.is_recurring),
    recurringObligationType: row.recurring_obligation_type || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbToAccount(row: any): LinkedAccount {
  return {
    id: row.id,
    userId: row.user_id,
    consentId: row.consent_id || null,
    institutionName: row.institution_name,
    accountNumberMask: row.account_number_mask,
    accountType: row.account_type,
    provider: row.provider,
    connectionStatus: row.connection_status,
    balance: Number(row.balance || 0),
    currency: row.currency || 'INR',
    lastSyncedAt: row.last_synced_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
