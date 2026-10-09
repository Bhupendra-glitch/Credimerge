"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.validatePasswordChange = validatePasswordChange;
exports.changePassword = changePassword;
exports.validatePasswordStrength = validatePasswordStrength;
exports.registerUser = registerUser;
exports.verifyEmailCode = verifyEmailCode;
exports.resendVerificationCode = resendVerificationCode;
exports.googleLogin = googleLogin;
exports.requestPasswordReset = requestPasswordReset;
exports.resetPassword = resetPassword;
exports.verifyToken = verifyToken;
exports.hashPassword = hashPassword;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const dotenv_1 = __importDefault(require("dotenv"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const firestoreService_1 = require("./firestoreService");
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    throw new Error('JWT_SECRET is required');
})();
const resetPasswordMessage = 'If an account exists for that email, a password reset link has been sent.';
async function login(userId, password) {
    const user = await (0, firestoreService_1.getUserAuthRecord)(userId.trim());
    if (!user)
        throw new Error('Invalid email/User ID or password.');
    let ok = false;
    if (user.passwordHash)
        ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    else if (process.env.ALLOW_DEMO_LOGIN === 'true'
        && user.password)
        ok = user.password === password;
    if (!ok)
        throw new Error('Invalid email/User ID or password.');
    const token = jsonwebtoken_1.default.sign({ userId: user.userId, workerType: user.worker_type || user.workerType || null }, JWT_SECRET, { expiresIn: '24h' });
    const safe = { ...user };
    delete safe.password;
    delete safe.passwordHash;
    return { token, user: safe };
}
function validatePasswordChange(newPassword, confirmPassword) {
    if (newPassword.length < 12)
        throw new Error('New password must be at least 12 characters.');
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
        throw new Error('New password must be no longer than 72 UTF-8 bytes.');
    }
    if (newPassword !== confirmPassword)
        throw new Error('New passwords do not match.');
}
async function changePassword(userId, currentPassword, newPassword, confirmPassword) {
    validatePasswordChange(newPassword, confirmPassword);
    if (!currentPassword)
        throw new Error('Current password is required.');
    if (currentPassword === newPassword)
        throw new Error('Choose a password different from your current password.');
    const user = await (0, firestoreService_1.getUserAuthRecord)(userId);
    if (!user)
        throw new Error('User account was not found.');
    const currentPasswordMatches = user.passwordHash
        ? await bcryptjs_1.default.compare(currentPassword, user.passwordHash)
        : user.password === currentPassword;
    if (!currentPasswordMatches)
        throw new Error('Current password is incorrect.');
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
    const updated = await (0, firestoreService_1.updateUserPassword)(userId, passwordHash);
    if (!updated)
        throw new Error('Password changes are unavailable for demo accounts.');
}
function getPasswordResetMailer() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM || user;
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from) {
        return null;
    }
    return {
        transport: nodemailer_1.default.createTransport({
            host,
            port,
            secure: process.env.SMTP_SECURE === 'true' || port === 465,
            auth: { user, pass },
        }),
        from,
    };
}
function validatePasswordStrength(password) {
    if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
    }
    if (Buffer.byteLength(password, 'utf8') > 72) {
        throw new Error('Password must be no longer than 72 bytes.');
    }
}
async function registerUser({ email, password, fullName, workerType, }) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
        throw new Error('Enter a valid email address.');
    }
    if (!fullName || fullName.trim().length < 2) {
        throw new Error('Enter your full name (at least 2 characters).');
    }
    validatePasswordStrength(password);
    const existing = await (0, firestoreService_1.getUserAuthRecord)(normalizedEmail);
    if (existing) {
        throw new Error('An account with this email address already exists. Please log in.');
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const userId = `GIG${Date.now().toString().slice(-4)}${randomSuffix}`;
    const defaultFinancials = {
        userId,
        user_id: userId,
        fullName: fullName.trim(),
        email: normalizedEmail,
        worker_type: workerType || 'Delivery Partner',
        passwordHash,
        emailVerified: false,
        age: 28,
        monthly_income: 42000,
        income_stability_score: 0.72,
        monthly_expenses: 24000,
        monthly_savings: 12000,
        existing_debt: 28000,
        monthly_emi: 2200,
        credit_card_balance: 14000,
        bnpl_balance: 5000,
        vehicle_loan_outstanding: 0,
        active_loan_count: 1,
        repayment_rate: 0.88,
        missed_payments_12m: 0,
        foir_pct: 5.24,
        monthly_cashflow: 18000,
        cashflow_score: 68.5,
        risk_band: 'Low Risk',
        forecast_30d_cashflow: 16200,
        forecast_60d_cashflow: 16500,
        forecast_90d_cashflow: 16800,
        createdAt: new Date().toISOString(),
    };
    const { createOrUpdateUser, storeEmailVerificationCode } = await Promise.resolve().then(() => __importStar(require('./firestoreService')));
    await createOrUpdateUser(defaultFinancials);
    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await storeEmailVerificationCode(normalizedEmail, code, expiresAt);
    const mailer = getPasswordResetMailer();
    if (mailer) {
        try {
            await mailer.transport.sendMail({
                from: mailer.from,
                to: normalizedEmail,
                subject: `${code} is your CrediMerge verification code`,
                text: `Welcome to CrediMerge, ${fullName}!\n\nYour 6-digit email verification code is: ${code}\n\nThis code will expire in 15 minutes.`,
                html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>Welcome to CrediMerge, ${fullName}!</h2>
          <p>Please use the verification code below to verify your email address:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #059669; padding: 16px 0;">${code}</div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 15 minutes. If you did not sign up for CrediMerge, please ignore this email.</p>
        </div>`,
            });
        }
        catch (err) {
            console.warn('Unable to send verification email via SMTP:', err);
        }
    }
    else {
        console.log(`[CrediMerge DEV] Email verification code for ${normalizedEmail}: ${code}`);
    }
    return {
        message: 'Verification code sent to your email address.',
        email: normalizedEmail,
        requiresVerification: true,
        devCode: mailer ? undefined : code,
    };
}
async function verifyEmailCode(email, code) {
    const normalizedEmail = email.trim().toLowerCase();
    const { verifyEmailCodeRecord, getUserAuthRecord, createOrUpdateUser } = await Promise.resolve().then(() => __importStar(require('./firestoreService')));
    const isValid = await verifyEmailCodeRecord(normalizedEmail, code.trim());
    if (!isValid) {
        throw new Error('Invalid or expired verification code. Please check and try again.');
    }
    const user = await getUserAuthRecord(normalizedEmail);
    if (!user) {
        throw new Error('User account not found.');
    }
    user.emailVerified = true;
    await createOrUpdateUser(user);
    const token = jsonwebtoken_1.default.sign({ userId: user.userId || user.user_id, workerType: user.worker_type || null }, JWT_SECRET, { expiresIn: '24h' });
    const safe = { ...user };
    delete safe.password;
    delete safe.passwordHash;
    return {
        token,
        user: safe,
        message: 'Email successfully verified!',
    };
}
async function resendVerificationCode(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const { getUserAuthRecord, storeEmailVerificationCode } = await Promise.resolve().then(() => __importStar(require('./firestoreService')));
    const user = await getUserAuthRecord(normalizedEmail);
    if (!user) {
        throw new Error('No account found with this email address.');
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await storeEmailVerificationCode(normalizedEmail, code, expiresAt);
    const mailer = getPasswordResetMailer();
    if (mailer) {
        try {
            await mailer.transport.sendMail({
                from: mailer.from,
                to: normalizedEmail,
                subject: `${code} is your new CrediMerge verification code`,
                text: `Your new 6-digit email verification code is: ${code}\n\nThis code expires in 15 minutes.`,
                html: `<div style="font-family: sans-serif; padding: 20px;">
          <h2>Your Verification Code</h2>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #059669; padding: 16px 0;">${code}</div>
          <p style="color: #64748b;">This code expires in 15 minutes.</p>
        </div>`,
            });
        }
        catch (err) {
            console.warn('Unable to resend email via SMTP:', err);
        }
    }
    else {
        console.log(`[CrediMerge DEV] Resent verification code for ${normalizedEmail}: ${code}`);
    }
    return {
        message: 'New verification code sent to your email.',
        email: normalizedEmail,
        devCode: mailer ? undefined : code,
    };
}
async function googleLogin(payload) {
    const normalizedEmail = (payload.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new Error('A valid email is required for Google Sign-In.');
    }
    const { getUserAuthRecord, createOrUpdateUser } = await Promise.resolve().then(() => __importStar(require('./firestoreService')));
    let user = await getUserAuthRecord(normalizedEmail);
    if (!user) {
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const userId = `GOOG${Date.now().toString().slice(-4)}${randomSuffix}`;
        user = {
            userId,
            user_id: userId,
            fullName: payload.name || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            profilePhoto: payload.picture || null,
            worker_type: 'Gig Worker',
            emailVerified: true,
            authProvider: 'google',
            age: 30,
            monthly_income: 45000,
            income_stability_score: 0.78,
            monthly_expenses: 25000,
            monthly_savings: 14000,
            existing_debt: 22000,
            monthly_emi: 1800,
            credit_card_balance: 11000,
            bnpl_balance: 3000,
            vehicle_loan_outstanding: 0,
            active_loan_count: 1,
            repayment_rate: 0.92,
            missed_payments_12m: 0,
            foir_pct: 4.0,
            monthly_cashflow: 20000,
            cashflow_score: 72.0,
            risk_band: 'Low Risk',
            forecast_30d_cashflow: 18000,
            forecast_60d_cashflow: 18300,
            forecast_90d_cashflow: 18600,
            createdAt: new Date().toISOString(),
        };
        await createOrUpdateUser(user);
    }
    else {
        // If existing, ensure emailVerified is true and update picture if not set
        let shouldUpdate = false;
        if (!user.emailVerified) {
            user.emailVerified = true;
            shouldUpdate = true;
        }
        if (!user.profilePhoto && payload.picture) {
            user.profilePhoto = payload.picture;
            shouldUpdate = true;
        }
        if (shouldUpdate) {
            await createOrUpdateUser(user);
        }
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.userId || user.user_id, workerType: user.worker_type || null }, JWT_SECRET, { expiresIn: '24h' });
    const safe = { ...user };
    delete safe.password;
    delete safe.passwordHash;
    return { token, user: safe };
}
async function requestPasswordReset(email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
        throw new Error('Enter a valid email address.');
    }
    const mailer = getPasswordResetMailer();
    const user = await (0, firestoreService_1.getUserAuthRecord)(normalizedEmail);
    if (!user || typeof user.email !== 'string' || user.email.toLowerCase() !== normalizedEmail) {
        return { message: resetPasswordMessage };
    }
    const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
    const tokenHash = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await (0, firestoreService_1.createPasswordResetToken)(user.userId || user.user_id, tokenHash, expiresAt);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    if (mailer) {
        try {
            await mailer.transport.sendMail({
                from: mailer.from,
                to: normalizedEmail,
                subject: 'Reset your CrediMerge password',
                text: `Use this link to reset your CrediMerge password. It expires in 30 minutes:\n\n${resetUrl}\n\nIf you did not request a password reset, you can ignore this email.`,
                html: `<p>Use the link below to reset your CrediMerge password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request a password reset, you can ignore this email.</p>`,
            });
        }
        catch (error) {
            console.error('Unable to send password reset email:', error);
            // Fallback in dev: don't crash
            console.log(`[CrediMerge DEV] Password reset link for ${normalizedEmail}: ${resetUrl}`);
            return { message: resetPasswordMessage, devResetUrl: resetUrl, token: rawToken };
        }
    }
    else {
        console.log(`[CrediMerge DEV] Password reset link for ${normalizedEmail}: ${resetUrl}`);
        return { message: resetPasswordMessage, devResetUrl: resetUrl, token: rawToken };
    }
    return { message: resetPasswordMessage };
}
async function resetPassword(rawToken, newPassword, confirmPassword) {
    validatePasswordChange(newPassword, confirmPassword);
    if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
        throw new Error('This password reset link is invalid or expired. Request a new one.');
    }
    const tokenHash = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
    const updated = await (0, firestoreService_1.consumePasswordResetToken)(tokenHash, passwordHash);
    if (!updated)
        throw new Error('This password reset link is invalid or expired. Request a new one.');
}
function verifyToken(token) {
    if (token.startsWith('demo-')) {
        const userId = token.slice('demo-'.length).trim().toUpperCase();
        if (!userId)
            throw new Error('Invalid demo token');
        return { userId };
    }
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 12);
}
