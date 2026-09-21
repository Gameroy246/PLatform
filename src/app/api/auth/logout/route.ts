import { NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/auth';
import { logAudit } from '@/lib/systemDb';

export async function POST() {
  const session = await getSession();
  if (session) {
     logAudit(session.id, 'LOGOUT', {});
  }
  await clearSession();
  return NextResponse.json({ success: true });
}
