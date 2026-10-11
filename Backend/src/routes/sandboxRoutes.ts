import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sandboxService } from '../services/sandbox.service';
import { saveSandboxVerification, getSandboxVerifications } from '../services/supabaseService';
import { recordVerificationEvent, getVerificationEvents } from '../services/tigerDataService';
import { isTigerConfigured } from '../config/tigerData';

const router = Router();

/**
 * Standardized error responder helper
 */
function sendError(res: Response, status: number, code: string, message: string, details?: any) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV !== 'production' && details ? { details } : {}),
    },
  });
}

/**
 * GET /api/sandbox/status
 * Returns service status and integration diagnostics
 */
router.get('/status', authenticate, async (_req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    service: 'sandbox-verification',
    environment: 'TEST/SANDBOX',
    configured: sandboxService.isLiveSandboxConfigured(),
    tigerDataConnected: isTigerConfigured(),
  });
});

/**
 * GET /api/sandbox/verifications
 * Returns user verification history from Supabase and Tiger Data
 */
router.get('/verifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const [supabaseVerifications, tigerEvents] = await Promise.all([
      getSandboxVerifications(userId),
      getVerificationEvents(userId),
    ]);

    return res.json({
      success: true,
      data: {
        verifications: supabaseVerifications,
        tigerAuditEvents: tigerEvents,
      },
    });
  } catch (err: any) {
    console.error('Error fetching verifications:', err);
    return sendError(res, 500, 'VERIFICATIONS_FETCH_FAILED', 'Failed to retrieve user verifications.');
  }
});

/**
 * POST /api/sandbox/pan/verify
 * Verifies PAN number against Sandbox API, stores in Supabase & Tiger Data
 */
router.post('/pan/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { pan, nameAsPerPan, dateOfBirth } = req.body || {};

    if (!pan || typeof pan !== 'string') {
      return sendError(res, 400, 'MISSING_PAN', 'PAN number is required.');
    }

    const cleanPan = pan.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      return sendError(res, 400, 'INVALID_PAN_FORMAT', 'Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F).');
    }

    const verificationResult = await sandboxService.verifyPAN({
      pan: cleanPan,
      nameAsPerPan: nameAsPerPan ? String(nameAsPerPan).trim() : undefined,
      dateOfBirth: dateOfBirth ? String(dateOfBirth).trim() : undefined,
    });

    // 1. Persist record to Supabase
    await saveSandboxVerification({
      id: `sbx_pan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      verificationType: 'PAN',
      status: verificationResult.status,
      referenceId: verificationResult.referenceId,
      provider: 'SANDBOX',
      maskedIdentifier: verificationResult.maskedIdentifier,
      metadata: {
        category: verificationResult.category,
        nameMatched: verificationResult.nameMatched,
        nameAsPerPan: verificationResult.nameAsPerPan,
        aadhaarSeedingStatus: verificationResult.aadhaarSeedingStatus,
        message: verificationResult.message,
      },
    });

    // 2. Stream audit event to Tiger Data (TimescaleDB)
    await recordVerificationEvent({
      userId,
      verificationType: 'PAN',
      status: verificationResult.status,
      referenceId: verificationResult.referenceId,
      maskedIdentifier: verificationResult.maskedIdentifier,
      nameMatched: verificationResult.nameMatched,
      source: 'SANDBOX_TEST',
      metadata: {
        category: verificationResult.category,
      },
    });

    return res.json({
      success: verificationResult.success,
      data: verificationResult,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    const code = err.code || 'SANDBOX_VERIFICATION_FAILED';
    const message = err.message || 'Verification could not be completed.';
    return sendError(res, status, code, message);
  }
});

/**
 * POST /api/sandbox/gst/verify
 * Verifies GSTIN against Sandbox API, stores in Supabase & Tiger Data
 */
router.post('/gst/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { gstin } = req.body || {};

    if (!gstin || typeof gstin !== 'string') {
      return sendError(res, 400, 'MISSING_GSTIN', 'GSTIN number is required.');
    }

    const cleanGst = gstin.trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGst)) {
      return sendError(res, 400, 'INVALID_GSTIN_FORMAT', 'Invalid GSTIN format. Must be 15 characters (e.g. 29AAAAA0000A1Z5).');
    }

    const verificationResult = await sandboxService.verifyGST({ gstin: cleanGst });

    // 1. Persist record to Supabase
    await saveSandboxVerification({
      id: `sbx_gst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      verificationType: 'GST',
      status: verificationResult.status,
      referenceId: verificationResult.referenceId,
      provider: 'SANDBOX',
      maskedIdentifier: verificationResult.maskedIdentifier,
      metadata: {
        tradeName: verificationResult.tradeName,
        legalName: verificationResult.legalName,
        taxpayerStatus: verificationResult.taxpayerStatus,
        constitution: verificationResult.constitution,
        message: verificationResult.message,
      },
    });

    // 2. Stream audit event to Tiger Data (TimescaleDB)
    await recordVerificationEvent({
      userId,
      verificationType: 'GST',
      status: verificationResult.status,
      referenceId: verificationResult.referenceId,
      maskedIdentifier: verificationResult.maskedIdentifier,
      nameMatched: true,
      source: 'SANDBOX_TEST',
      metadata: {
        tradeName: verificationResult.tradeName,
        taxpayerStatus: verificationResult.taxpayerStatus,
      },
    });

    return res.json({
      success: verificationResult.success,
      data: verificationResult,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    const code = err.code || 'SANDBOX_VERIFICATION_FAILED';
    const message = err.message || 'Verification could not be completed.';
    return sendError(res, status, code, message);
  }
});

/**
 * POST /api/sandbox/bank-account/verify
 * Verifies bank account via Penny Drop / Penniless API, stores in Supabase & Tiger Data
 */
router.post('/bank-account/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accountNumber, ifsc } = req.body || {};

    if (!accountNumber || typeof accountNumber !== 'string') {
      return sendError(res, 400, 'MISSING_ACCOUNT_NUMBER', 'Bank account number is required.');
    }

    if (!ifsc || typeof ifsc !== 'string') {
      return sendError(res, 400, 'MISSING_IFSC', 'Bank IFSC code is required.');
    }

    const cleanAccount = accountNumber.trim().replace(/\s+/g, '');
    const cleanIfsc = ifsc.trim().toUpperCase();

    if (!/^\d{9,18}$/.test(cleanAccount)) {
      return sendError(res, 400, 'INVALID_ACCOUNT_NUMBER', 'Account number must be between 9 and 18 digits.');
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      return sendError(res, 400, 'INVALID_IFSC_CODE', 'Invalid IFSC format (e.g. HDFC0000001).');
    }

    const verificationResult = await sandboxService.verifyBankAccount({
      accountNumber: cleanAccount,
      ifsc: cleanIfsc,
    });

    // 1. Persist record to Supabase
    await saveSandboxVerification({
      id: `sbx_bank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      verificationType: 'BANK_ACCOUNT',
      status: verificationResult.status,
      referenceId: verificationResult.referenceId,
      provider: 'SANDBOX',
      maskedIdentifier: verificationResult.maskedIdentifier,
      metadata: {
        ifsc: verificationResult.ifsc,
        accountHolderName: verificationResult.accountHolderName,
        accountExists: verificationResult.accountExists,
        message: verificationResult.message,
      },
    });

    // 2. Stream audit event to Tiger Data (TimescaleDB)
    await recordVerificationEvent({
      userId,
      verificationType: 'BANK_ACCOUNT',
      status: verificationResult.status,
      referenceId: verificationResult.referenceId,
      maskedIdentifier: verificationResult.maskedIdentifier,
      nameMatched: Boolean(verificationResult.accountHolderName),
      source: 'SANDBOX_TEST',
      metadata: {
        ifsc: verificationResult.ifsc,
        accountExists: verificationResult.accountExists,
      },
    });

    return res.json({
      success: verificationResult.success,
      data: verificationResult,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    const code = err.code || 'SANDBOX_VERIFICATION_FAILED';
    const message = err.message || 'Verification could not be completed.';
    return sendError(res, status, code, message);
  }
});

export default router;
