import jwt from 'jsonwebtoken';
import { findUser, getSafeUser, UserRecord } from './csvService';

const JWT_SECRET = process.env.JWT_SECRET || 'credimerge_secret';

export interface LoginResult {
  token: string;
  user: Omit<UserRecord, 'password'>;
}

export function login(userId: string, password: string): LoginResult {
  const user = findUser(userId);
  if (!user) {
    throw new Error('Invalid User ID');
  }
  if (user.password !== password) {
    throw new Error('Incorrect password');
  }
  const token = jwt.sign(
    { userId: user.user_id, workerType: user.worker_type },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  return { token, user: getSafeUser(user) };
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}