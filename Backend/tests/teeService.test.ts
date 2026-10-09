import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAttestationQuote,
  verifyAttestationReport,
  encryptForEnclave,
  computeConfidentialRisk,
} from '../src/services/teeService';

describe('Trusted Execution Environment (TEE) Security Suite', () => {
  it('generates valid cryptographic attestation quote with MRENCLAVE & ECDSA signature', async () => {
    const nonce = 'TEST_NONCE_ABCD_1234';
    const quote = await generateAttestationQuote(nonce);

    assert.equal(quote.nonce, nonce);
    assert.ok(quote.mrenclave.length === 64, 'MRENCLAVE must be valid SHA-256');
    assert.ok(quote.mrsigner.length === 64, 'MRSIGNER must be valid SHA-256');
    assert.ok(quote.signature.length > 30, 'Quote must have cryptographic signature');
    assert.ok(quote.publicKeyPem.includes('BEGIN PUBLIC KEY'));

    // Verify attestation
    const isValid = verifyAttestationReport(quote, nonce);
    assert.equal(isValid, true, 'Attestation quote must verify successfully');
  });

  it('rejects attestation quote when nonce or measurement is tampered', async () => {
    const quote = await generateAttestationQuote('VALID_NONCE');

    // 1. Nonce mismatch
    const badNonce = verifyAttestationReport(quote, 'DIFFERENT_NONCE');
    assert.equal(badNonce, false, 'Must reject nonce mismatch');

    // 2. Tampered measurement
    const tamperedQuote = { ...quote, mrenclave: '0000000000000000000000000000000000000000000000000000000000000000' };
    const badMeasurement = verifyAttestationReport(tamperedQuote, 'VALID_NONCE');
    assert.equal(badMeasurement, false, 'Must reject tampered enclave measurement');
  });

  it('performs AES-256-GCM envelope encryption with authentication tag', () => {
    const sensitiveData = {
      userPan: 'ABCDE1234F',
      accountNumber: '123456789012',
      monthlySalary: 75000,
    };

    const encrypted = encryptForEnclave(sensitiveData);
    assert.ok(encrypted.ciphertext);
    assert.ok(encrypted.iv);
    assert.ok(encrypted.authTag);

    // Ensure raw data is not in ciphertext
    assert.equal(encrypted.ciphertext.includes('ABCDE1234F'), false);
    assert.equal(encrypted.ciphertext.includes('75000'), false);
  });

  it('computes confidential risk metrics and produces zero-PII tokenized output', async () => {
    const result = await computeConfidentialRisk('TEE_USER_99', {
      monthlyIncome: 65000,
      monthlyExpenses: 25000,
      loans: [
        { outstanding: 120000, rate: 16, tenure: 24, emi: 5800 },
        { outstanding: 80000, rate: 22, tenure: 18, emi: 5200 },
      ],
      transactionCredits30d: 65000,
      transactionDebits30d: 36000,
    });

    assert.ok(result.tokenizedProfileId.startsWith('TOK_TEE_'));
    assert.equal(result.tokenizedProfileId.includes('TEE_USER_99'), false, 'User ID must be tokenized/anonymized');
    assert.equal(result.verifiedMonthlyIncome, 65000);
    assert.ok(result.debtStressIndex >= 0 && result.debtStressIndex <= 100);
    assert.equal(result.isConsolidationEconomicallyViable, true);
    assert.ok(result.estimatedInterestSavings > 0);
    assert.ok(result.attestationVerificationProof);
  });
});
