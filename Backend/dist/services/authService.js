"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.validatePasswordChange = validatePasswordChange;
exports.changePassword = changePassword;
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
    else if (process.env.NODE_ENV !== 'production'
        && process.env.ALLOW_DEMO_LOGIN === 'true'
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
        throw new Error('Password reset email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM.');
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
async function requestPasswordReset(email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
        throw new Error('Enter a valid email address.');
    }
    const mailer = getPasswordResetMailer();
    const user = await (0, firestoreService_1.getUserAuthRecord)(normalizedEmail);
    if (!user || typeof user.email !== 'string' || user.email.toLowerCase() !== normalizedEmail) {
        return resetPasswordMessage;
    }
    const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
    const tokenHash = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await (0, firestoreService_1.createPasswordResetToken)(user.userId, tokenHash, expiresAt);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
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
        throw new Error('Unable to send the password reset email. Check SMTP configuration and try again.');
    }
    return resetPasswordMessage;
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
