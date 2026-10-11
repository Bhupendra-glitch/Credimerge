import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SandboxService } from '../src/services/sandbox.service';
import {
  saveSandboxVerification,
  getSandboxVerifications,
} from '../src/services/supabaseService';
import {
  recordVerificationEvent,
  getVerificationEvents,
} from '../src/services/tigerDataService';

describe('Sandbox.co.in Verification & Tiger Data Suite', () => {
  const service = new SandboxService();
  const testUserId = 'TEST_SBX_USER_' + Date.now();

  it('authenticates and produces access token with 24-hr caching', async () => {
    const token1 = await service.authenticate();
    assert.ok(token1, 'Access token must be generated');
    assert.ok(token1.length > 10, 'Token length must be valid');

    const token2 = await service.authenticate();
    assert.equal(token1, token2, 'Should return cached access token within validity window');

    const refreshed = await service.authenticate(true);
    assert.ok(refreshed, 'Should successfully force-refresh token');
  });

  it('correctly masks PAN, GST, and Bank Account numbers without exposing raw PII', () => {
    const maskedPan = service.maskIdentifier('ABCDE1234F', 'PAN');
    assert.equal(maskedPan, 'ABC****34F');

    const maskedGst = service.maskIdentifier('29AAAAA0000A1Z5', 'GST');
    assert.equal(maskedGst, '29AA******0A1Z5');

    const maskedBank = service.maskIdentifier('919876543210', 'BANK');
    assert.equal(maskedBank, '•••• •••• 3210');
  });

  it('verifies PAN format and returns normalized verification response', async () => {
    const res = await service.verifyPAN({
      pan: 'ABCDE1234F',
      nameAsPerPan: 'Bhupendra Sahu',
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'VERIFIED');
    assert.equal(res.verificationType, 'PAN');
    assert.equal(res.provider, 'SANDBOX');
    assert.ok(res.maskedIdentifier.includes('****'));
    assert.ok(res.referenceId.length > 5);
  });

  it('rejects invalid PAN format with standard error code', async () => {
    await assert.rejects(
      async () => {
        await service.verifyPAN({ pan: 'INVALID123' });
      },
      (err: any) => {
        assert.equal(err.code, 'INVALID_PAN_FORMAT');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it('handles invalid test PAN lookup appropriately', async () => {
    const res = await service.verifyPAN({ pan: 'XXXXX0000X' });
    assert.equal(res.success, false);
    assert.equal(res.status, 'FAILED');
  });

  it('verifies GSTIN format and returns active taxpayer status and trade name', async () => {
    const res = await service.verifyGST({
      gstin: '29AAAAA0000A1Z5',
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'VERIFIED');
    assert.equal(res.verificationType, 'GST');
    assert.equal(res.provider, 'SANDBOX');
    assert.ok(res.tradeName);
    assert.ok(res.taxpayerStatus);
  });

  it('rejects invalid GSTIN format with 400 status', async () => {
    await assert.rejects(
      async () => {
        await service.verifyGST({ gstin: 'NOT_A_GSTIN' });
      },
      (err: any) => {
        assert.equal(err.code, 'INVALID_GSTIN_FORMAT');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it('verifies Bank Account via Penny Drop endpoint and returns registered holder name', async () => {
    const res = await service.verifyBankAccount({
      accountNumber: '919876543210',
      ifsc: 'HDFC0000001',
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'VERIFIED');
    assert.equal(res.verificationType, 'BANK_ACCOUNT');
    assert.equal(res.accountExists, true);
    assert.ok(res.accountHolderName);
    assert.ok(res.maskedIdentifier.includes('••••'));
  });

  it('rejects invalid bank account number or invalid IFSC code', async () => {
    await assert.rejects(
      async () => {
        await service.verifyBankAccount({ accountNumber: '123', ifsc: 'HDFC0000001' });
      },
      (err: any) => {
        assert.equal(err.code, 'INVALID_ACCOUNT_NUMBER');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await service.verifyBankAccount({ accountNumber: '919876543210', ifsc: 'INVALID_IFSC' });
      },
      (err: any) => {
        assert.equal(err.code, 'INVALID_IFSC_CODE');
        return true;
      }
    );
  });

  it('persists verification record into Supabase with retrieval by user_id', async () => {
    const record = await saveSandboxVerification({
      id: `test_sbx_${Date.now()}`,
      userId: testUserId,
      verificationType: 'PAN',
      status: 'VERIFIED',
      referenceId: 'REF_PAN_999',
      provider: 'SANDBOX',
      maskedIdentifier: 'ABC****34F',
      metadata: { category: 'individual' },
    });

    assert.ok(record.id);
    assert.equal(record.userId, testUserId);
    assert.equal(record.verificationType, 'PAN');

    const history = await getSandboxVerifications(testUserId);
    assert.ok(history.length >= 1);
    assert.equal(history[0].maskedIdentifier, 'ABC****34F');
  });

  it('streams verification audit events into Tiger Data TimescaleDB hypertable', async () => {
    const event = await recordVerificationEvent({
      userId: testUserId,
      verificationType: 'BANK_ACCOUNT',
      status: 'VERIFIED',
      referenceId: 'REF_TIGER_BANK_001',
      maskedIdentifier: '•••• •••• 3210',
      nameMatched: true,
      source: 'SANDBOX_TEST',
      metadata: { ifsc: 'HDFC0000001' },
    });

    assert.ok(event.time);
    assert.equal(event.user_id, testUserId);
    assert.equal(event.verification_type, 'BANK_ACCOUNT');
    assert.equal(event.status, 'VERIFIED');

    const events = await getVerificationEvents(testUserId);
    assert.ok(events.length >= 1);
    const found = events.find((e) => e.reference_id === 'REF_TIGER_BANK_001');
    assert.ok(found, 'Recorded event must be retrievable from Tiger Data');
  });
});
