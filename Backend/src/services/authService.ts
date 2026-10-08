import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  getUserAuthRecord,
  updateUserPassword,
} from './firestoreService';

dotenv.config();

const JWT_SECRET: string = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET is required');
})();

export interface LoginResult {
  token: string;
  user: Record<string, any>;
}

const resetPasswordMessage = 'If an account exists for that email, a password reset link has been sent.';

export async function login(userId: string, password: string): Promise<LoginResult> {
  const user = await getUserAuthRecord(userId.trim());
  if (!user) throw new Error('Invalid email/User ID or password.');

  let ok = false;
  if (user.passwordHash) ok = await bcrypt.compare(password, user.passwordHash);
  else if (
    process.env.ALLOW_DEMO_LOGIN === 'true'
    && user.password
  ) ok = user.password === password;

  if (!ok) throw new Error('Invalid email/User ID or password.');

  const token = jwt.sign(
    { userId: user.userId, workerType: user.worker_type || user.workerType || null },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const safe = { ...user };
  delete safe.password;
  delete safe.passwordHash;

  return { token, user: safe };
}

export function validatePasswordChange(newPassword: string, confirmPassword: string) {
  if (newPassword.length < 12) throw new Error('New password must be at least 12 characters.');
  if (Buffer.byteLength(newPassword, 'utf8') > 72) {
    throw new Error('New password must be no longer than 72 UTF-8 bytes.');
  }
  if (newPassword !== confirmPassword) throw new Error('New passwords do not match.');
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  validatePasswordChange(newPassword, confirmPassword);
  if (!currentPassword) throw new Error('Current password is required.');
  if (currentPassword === newPassword) throw new Error('Choose a password different from your current password.');

  const user = await getUserAuthRecord(userId);
  if (!user) throw new Error('User account was not found.');

  const currentPasswordMatches = user.passwordHash
    ? await bcrypt.compare(currentPassword, user.passwordHash)
    : user.password === currentPassword;
  if (!currentPasswordMatches) throw new Error('Current password is incorrect.');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updated = await updateUserPassword(userId, passwordHash);
  if (!updated) throw new Error('Password changes are unavailable for demo accounts.');
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
    transport: nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: { user, pass },
    }),
    from,
  };
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw new Error('Enter a valid email address.');
  }

  const mailer = getPasswordResetMailer();
  const user = await getUserAuthRecord(normalizedEmail);
  if (!user || typeof user.email !== 'string' || user.email.toLowerCase() !== normalizedEmail) {
    return resetPasswordMessage;
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await createPasswordResetToken(user.userId, tokenHash, expiresAt);

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
  } catch (error) {
    console.error('Unable to send password reset email:', error);
    throw new Error('Unable to send the password reset email. Check SMTP configuration and try again.');
  }

  return resetPasswordMessage;
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
  confirmPassword: string,
) {
  validatePasswordChange(newPassword, confirmPassword);
  if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
    throw new Error('This password reset link is invalid or expired. Request a new one.');
  }

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updated = await consumePasswordResetToken(tokenHash, passwordHash);
  if (!updated) throw new Error('This password reset link is invalid or expired. Request a new one.');
}

export function verifyToken(token: string) {
  if (token.startsWith('demo-')) {
    const userId = token.slice('demo-'.length).trim().toUpperCase();
    if (!userId) throw new Error('Invalid demo token');
    return { userId } as { userId: string; workerType?: string };
  }

  return jwt.verify(token, JWT_SECRET) as unknown as { userId: string; workerType?: string };
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
