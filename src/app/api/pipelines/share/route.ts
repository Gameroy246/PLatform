import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, logAudit } from '@/lib/systemDb';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, shared_with } = await req.json();
    if (!id || !Array.isArray(shared_with)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const existing = db.prepare('SELECT owner_id FROM pipelines WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    if (existing.owner_id !== session.id && session.role !== 'SUPERUSER') {
       return NextResponse.json({ error: 'Permission denied. You do not own this pipeline.' }, { status: 403 });
    }

    db.prepare('UPDATE pipelines SET shared_with = ? WHERE id = ?').run(JSON.stringify(shared_with), id);
    logAudit(session.id, 'PIPELINE_SHARED', { pipelineId: id, sharedWith: shared_with });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Share Pipeline Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
