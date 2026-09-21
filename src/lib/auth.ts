import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from './systemDb';

// In a real app, this should be an environment variable
const crypto = require('crypto');
const fsModule = require('fs');
let JWT_SECRET: string = process.env.JWT_SECRET || '';
try {
  JWT_SECRET = JWT_SECRET || fsModule.readFileSync('./.jwt_secret', 'utf8');
} catch (e) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  fsModule.writeFileSync('./.jwt_secret', JWT_SECRET);
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'SUPERUSER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  mfa_enabled: boolean;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, mfa_enabled: user.mfa_enabled },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch (e) {
    return null;
  }
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('architect_session')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSession(user: AuthUser) {
  const token = generateToken(user);
  const cookieStore = await cookies();
  cookieStore.set('architect_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('architect_session');
}
