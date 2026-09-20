import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/systemDb';

export async function GET() {
  const session = await getSession();
  if (!session) {
     return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Fetch full user details securely (no password)
  const stmt = db.prepare(`SELECT id, email, role, mfa_enabled, features FROM users WHERE id = ?`);
  const user = stmt.get(session.id);

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ 
     authenticated: true,
     user
  });
}
