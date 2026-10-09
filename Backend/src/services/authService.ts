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
} from './supabaseService';

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
    return null;
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

export function validatePasswordStrength(password: string) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Password must be no longer than 72 bytes.');
  }
}

export async function registerUser({
  email,
  password,
  fullName,
  workerType,
}: {
  email: string;
  password: string;
  fullName: string;
  workerType?: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw new Error('Enter a valid email address.');
  }
  if (!fullName || fullName.trim().length < 2) {
    throw new Error('Enter your full name (at least 2 characters).');
  }
  validatePasswordStrength(password);

  const existing = await getUserAuthRecord(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const userId = `USR_${Date.now().toString().slice(-6)}${randomSuffix}`;

  const defaultFinancials = {
    userId,
    user_id: userId,
    fullName: fullName.trim(),
    email: normalizedEmail,
    worker_type: workerType || 'Individual',
    passwordHash,
    emailVerified: false,
    age: 26,
    monthly_income: 0,
    income_stability_score: 0.8,
    monthly_expenses: 0,
    monthly_savings: 0,
    existing_debt: 0,
    monthly_emi: 0,
    credit_card_balance: 0,
    bnpl_balance: 0,
    vehicle_loan_outstanding: 0,
    active_loan_count: 0,
    repayment_rate: 1.0,
    missed_payments_12m: 0,
    foir_pct: 0,
    monthly_cashflow: 0,
    emergency_expense: 0,
    income_drop_scenario_pct: 0,
    cashflow_score: 0,
    risk_band: 'Unassessed',
    forecast_30d_cashflow: 0,
    forecast_60d_cashflow: 0,
    forecast_90d_cashflow: 0,
    createdAt: new Date().toISOString(),
  };

  const { createOrUpdateUser, storeEmailVerificationCode } = await import('./supabaseService');
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
    } catch (err) {
      console.warn('Unable to send verification email via SMTP:', err);
    }
  } else {
    console.log(`[CrediMerge DEV] Email verification code for ${normalizedEmail}: ${code}`);
  }

  return {
    message: 'Verification code sent to your email address.',
    email: normalizedEmail,
    requiresVerification: true,
    devCode: mailer ? undefined : code,
  };
}

export async function verifyEmailCode(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const { verifyEmailCodeRecord, getUserAuthRecord, createOrUpdateUser } = await import('./supabaseService');
  
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

  const token = jwt.sign(
    { userId: user.userId || user.user_id, workerType: user.worker_type || null },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const safe = { ...user };
  delete safe.password;
  delete safe.passwordHash;

  return {
    token,
    user: safe,
    message: 'Email successfully verified!',
  };
}

export async function resendVerificationCode(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const { getUserAuthRecord, storeEmailVerificationCode } = await import('./supabaseService');
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
    } catch (err) {
      console.warn('Unable to resend email via SMTP:', err);
    }
  } else {
    console.log(`[CrediMerge DEV] Resent verification code for ${normalizedEmail}: ${code}`);
  }

  return {
    message: 'New verification code sent to your email.',
    email: normalizedEmail,
    devCode: mailer ? undefined : code,
  };
}

export async function googleLogin(payload: {
  email: string;
  name?: string;
  picture?: string;
  credential?: string;
}) {
  const normalizedEmail = (payload.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('A valid email is required for Google Sign-In.');
  }

  const { getUserAuthRecord, createOrUpdateUser } = await import('./supabaseService');
  let user = await getUserAuthRecord(normalizedEmail);

  if (!user) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const userId = `GOOG_${Date.now().toString().slice(-6)}${randomSuffix}`;
    user = {
      userId,
      user_id: userId,
      fullName: payload.name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      profilePhoto: payload.picture || null,
      worker_type: 'Individual',
      emailVerified: true,
      authProvider: 'google',
      age: 26,
      monthly_income: 0,
      income_stability_score: 0.8,
      monthly_expenses: 0,
      monthly_savings: 0,
      existing_debt: 0,
      monthly_emi: 0,
      credit_card_balance: 0,
      bnpl_balance: 0,
      vehicle_loan_outstanding: 0,
      active_loan_count: 0,
      repayment_rate: 1.0,
      missed_payments_12m: 0,
      foir_pct: 0,
      monthly_cashflow: 0,
      cashflow_score: 0,
      risk_band: 'Unassessed',
      forecast_30d_cashflow: 0,
      forecast_60d_cashflow: 0,
      forecast_90d_cashflow: 0,
      createdAt: new Date().toISOString(),
    };
    await createOrUpdateUser(user);
  } else {
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

  const token = jwt.sign(
    { userId: user.userId || user.user_id, workerType: user.worker_type || null },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const safe = { ...user };
  delete safe.password;
  delete safe.passwordHash;

  return { token, user: safe };
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw new Error('Enter a valid email address.');
  }

  const mailer = getPasswordResetMailer();
  const user = await getUserAuthRecord(normalizedEmail);
  if (!user || typeof user.email !== 'string' || user.email.toLowerCase() !== normalizedEmail) {
    return { message: resetPasswordMessage };
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await createPasswordResetToken(user.userId || user.user_id, tokenHash, expiresAt);

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
    } catch (error) {
      console.error('Unable to send password reset email:', error);
      // Fallback in dev: don't crash
      console.log(`[CrediMerge DEV] Password reset link for ${normalizedEmail}: ${resetUrl}`);
      return { message: resetPasswordMessage, devResetUrl: resetUrl, token: rawToken };
    }
  } else {
    console.log(`[CrediMerge DEV] Password reset link for ${normalizedEmail}: ${resetUrl}`);
    return { message: resetPasswordMessage, devResetUrl: resetUrl, token: rawToken };
  }

  return { message: resetPasswordMessage };
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

