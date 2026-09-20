import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, logAudit } from '@/lib/systemDb';
import { setSession } from '@/lib/auth';
const { authenticator } = require('otplib');

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'captcha_secret_architect';

export async function POST(req: Request) {
  try {
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
