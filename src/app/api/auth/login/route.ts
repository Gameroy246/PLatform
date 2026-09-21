import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, logAudit } from '@/lib/systemDb';
import { setSession } from '@/lib/auth';
const { authenticator } = require('otplib');

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'captcha_secret_architect';

// Basic In-Memory Rate Limiter for DDoS/Brute Force Protection
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitData = rateLimitMap.get(ip);
  if (!limitData) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); // 1 min window
    return true;
  }
  if (now > limitData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (limitData.count > 10) {
    return false; // Throttled
  }
  limitData.count++;
  return true;
}


export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    const { email, password, captchaText, captchaHash, otp } = await req.json();

    // Verify Captcha
    if (!captchaText || !captchaHash) {
       return NextResponse.json({ error: 'CAPTCHA required' }, { status: 400 });
    }
    
    const expectedHash = crypto.createHmac('sha256', CAPTCHA_SECRET).update(captchaText.toLowerCase()).digest('hex');
    if (expectedHash !== captchaHash) {
       return NextResponse.json({ error: 'Invalid CAPTCHA' }, { status: 400 });
    }

    // Find User
    const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
    const user = stmt.get(email) as any;

    if (!user) {
       logAudit(null, 'LOGIN_FAILED', { email, reason: 'User not found' });
       return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify Password
    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
       logAudit(user.id, 'LOGIN_FAILED', { reason: 'Invalid password' });
       return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify 2FA/OTP if enabled
    if (user.mfa_enabled && user.mfa_secret) {
       if (!otp) {
          return NextResponse.json({ requireOtp: true });
       }
       const isValidOtp = authenticator.verify({ token: otp, secret: user.mfa_secret });
       if (!isValidOtp) {
          logAudit(user.id, 'LOGIN_FAILED', { reason: 'Invalid OTP' });
          return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
       }
    }

    // Check if password reset is forced
    if (user.force_password_change === 1) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + 15 * 60 * 1000;
      db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(resetToken, expires, user.id);
      return NextResponse.json({ success: true, requirePasswordChange: true, tempToken: resetToken, email: user.email });
    }

    // Success
    await setSession({
      id: user.id,
      email: user.email,
      role: user.role,
      mfa_enabled: user.mfa_enabled === 1
    });

    logAudit(user.id, 'LOGIN_SUCCESS', {});
    return NextResponse.json({ success: true, role: user.role });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
