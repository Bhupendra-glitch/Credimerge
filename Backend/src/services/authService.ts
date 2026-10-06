import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { getUserAuthRecord, updateUserPassword } from './firestoreService';

dotenv.config();

const JWT_SECRET: string = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET is required');
})();

export interface LoginResult {
  token: string;
  user: Record<string, any>;
}

export async function login(userId: string, password: string): Promise<LoginResult> {
  const user = await getUserAuthRecord(userId.trim());
  if (!user) throw new Error('Invalid email/User ID or password.');

  let ok = false;
  if (user.passwordHash) ok = await bcrypt.compare(password, user.passwordHash);
  else if (
    process.env.NODE_ENV !== 'production'
    && process.env.ALLOW_DEMO_LOGIN === 'true'
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
