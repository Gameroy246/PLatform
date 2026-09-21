import { NextResponse } from 'next/server';
import { db, logAudit } from '@/lib/systemDb';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, token, newPassword } = await req.json();

    // Step 1: Request Reset (Send Token)
    if (email && !token && !newPassword) {
      const stmt = db.prepare(`SELECT id FROM users WHERE email = ?`);
      const user = stmt.get(email) as any;
      if (user) {
         const resetToken = crypto.randomBytes(32).toString('hex');
         const expires = Date.now() + 15 * 60 * 1000; // 15 mins
         db.prepare(`UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`).run(resetToken, expires, user.id);
         
         // Mocking SMTP Email Sending by printing to console
         console.log(`\n\n==============================================`);
         console.log(`[SMTP MOCK] Password Reset Email to: ${email}`);
         console.log(`Reset Token: ${resetToken}`);
         console.log(`Link: http://localhost:3000/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`);
         console.log(`==============================================\n\n`);
         
         logAudit(user.id, 'PASSWORD_RESET_REQUESTED', {});
      }
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link was sent.' });
    }

    // Step 2: Fulfill Reset
    if (email && token && newPassword) {
      const stmt = db.prepare(`SELECT id, reset_expires FROM users WHERE email = ? AND reset_token = ?`);
      const user = stmt.get(email, token) as any;
      
      if (!user) {
         return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
      }
      
      if (Date.now() > user.reset_expires) {
         return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
      }

      const hash = bcrypt.hashSync(newPassword, 10);
      db.prepare(`UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?`).run(hash, user.id);
      
      logAudit(user.id, 'PASSWORD_RESET_SUCCESS', {});
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
