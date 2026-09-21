import { NextResponse } from 'next/server';
import { db, logAudit } from '@/lib/systemDb';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function isSuperuser() {
  const session = await getSession();
  return session && session.role === 'SUPERUSER';
}

export async function GET() {
  if (!(await isSuperuser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const stmt = db.prepare(`SELECT id, email, role, mfa_enabled, features, created_at FROM users ORDER BY created_at DESC`);
  const users = stmt.all();
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  if (!(await isSuperuser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  try {
    const { email, password, role } = await req.json();
    const id = 'usr_' + crypto.randomBytes(8).toString('hex');
    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`INSERT INTO users (id, email, password_hash, role, force_password_change) VALUES (?, ?, ?, ?, 1)`);
    stmt.run(id, email, hash, role || 'EDITOR');
    const session = await getSession();
    logAudit(session?.id || null, 'CREATE_USER', { targetEmail: email, role });
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!(await isSuperuser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  try {
    const { id, role, features } = await req.json();
    const session = await getSession();
    if (role) {
      const stmt = db.prepare(`UPDATE users SET role = ? WHERE id = ?`);
      stmt.run(role, id);
      logAudit(session?.id || null, 'UPDATE_USER_ROLE', { targetId: id, role });
    }
    if (features) {
      const stmt = db.prepare(`UPDATE users SET features = ? WHERE id = ?`);
      stmt.run(JSON.stringify(features), id);
      logAudit(session?.id || null, 'UPDATE_USER_FEATURES', { targetId: id, features });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isSuperuser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  try {
    const { id } = await req.json();
    // Delete their pipelines too
    db.prepare(`DELETE FROM pipelines WHERE owner_id = ?`).run(id);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    const session = await getSession();
    logAudit(session?.id || null, 'DELETE_USER', { targetId: id });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
