import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserAuthRecord } from './firestoreService';

const JWT_SECRET: string = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET is required');
})();

export interface LoginResult {
  token: string;
  user: Record<string, any>;
}

export async function login(userId: string, password: string): Promise<LoginResult> {
  const user = await getUserAuthRecord(userId.trim().toUpperCase());
  if (!user) throw new Error('Invalid User ID');

  let ok = false;
  if (user.passwordHash) ok = await bcrypt.compare(password, user.passwordHash);
  else if (user.password) ok = user.password === password; // migration-only fallback

  if (!ok) throw new Error('Incorrect password');

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

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as unknown as { userId: string; workerType?: string };
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
