import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  createConsentRequest,
  getUserConsent,
  revokeConsent,
  connectSandboxAccount,
  syncAccount,
  verifyWebhookSignature,
} from '../src/services/financialProviderService';

describe('Financial Provider & Consent Management Suite', () => {
  it('creates and manages user consent artifact adhering to AA requirements', async () => {
    const userId = 'CONSENT_USER_' + Date.now();
    const consent = await createConsentRequest(userId, {
      handle: 'user99@onemoney.aa',
      scopes: ['TRANSACTIONS', 'PROFILE'],
      validityDays: 30,
    });

    assert.ok(consent.id.startsWith('CNS_'));
    assert.equal(consent.status, 'ACTIVE');
    assert.equal(consent.handle, 'user99@onemoney.aa');
    assert.deepEqual(consent.scopes, ['TRANSACTIONS', 'PROFILE']);

    const loaded = await getUserConsent(userId);
    assert.ok(loaded);
    assert.equal(loaded.id, consent.id);

    // Revoke consent
    await revokeConsent(userId, consent.id);
    const afterRevoke = await getUserConsent(userId);
    assert.equal(afterRevoke?.status, 'REVOKED');
  });

  it('connects sandbox account with clearly flagged sandbox transactions', async () => {
    const userId = 'SANDBOX_USER_' + Date.now();
    const result = await connectSandboxAccount(userId, 'HDFC Bank');

    assert.ok(result.account.id.startsWith('ACC_'));
    assert.equal(result.account.provider, 'SANDBOX');
    assert.equal(result.account.institutionName, 'HDFC Bank');
    assert.ok(result.account.accountNumberMask.includes('•'));

    // Check transactions
    assert.ok(result.transactions.length > 0);
    for (const tx of result.transactions) {
      assert.equal(tx.source, 'SANDBOX', 'Transactions must be explicitly flagged as SANDBOX');
    }
  });

  it('rejects synchronization when consent is revoked', async () => {
    const userId = 'REVOKE_USER_' + Date.now();
    const result = await connectSandboxAccount(userId, 'ICICI Bank');
    const consent = await getUserConsent(userId);
    assert.ok(consent);

    await revokeConsent(userId, consent.id);

    await assert.rejects(
      async () => {
        await syncAccount(userId, result.account.id);
      },
      /CONSENT_EXPIRED/,
      'Sync must fail when consent is expired or revoked'
    );
  });

  it('validates authentic webhook signatures and rejects forged requests', () => {
    const secret = process.env.FINANCIAL_WEBHOOK_SECRET || 'credimerge_aa_webhook_secret_key_2026';
    const payload = JSON.stringify({
      userId: 'USR_1',
      accountId: 'ACC_1',
      transactions: [{ providerTxId: 'P1', amount: 500 }],
    });

    // Valid signature
    const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    assert.equal(verifyWebhookSignature(payload, validSignature), true);

    // Forged signature
    const forgedSignature = crypto.createHmac('sha256', 'wrong_secret').update(payload).digest('hex');
    assert.equal(verifyWebhookSignature(payload, forgedSignature), false);

    // Altered payload with original signature (replay / tampering protection)
    const alteredPayload = JSON.stringify({
      userId: 'USR_1',
      accountId: 'ACC_1',
      transactions: [{ providerTxId: 'P1', amount: 500000 }], // tampered amount
    });
    assert.equal(verifyWebhookSignature(alteredPayload, validSignature), false);
  });
});
