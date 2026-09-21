const fs = require('fs');
const code = `
export async function DELETE(req: Request) {
  try {
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing pipeline id' }, { status: 400 });

    const existing = db.prepare('SELECT owner_id FROM pipelines WHERE id = ?').get(id) as any;
    if (!existing) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

    if (existing.owner_id !== session.id && session.role !== 'SUPERUSER') {
       return NextResponse.json({ error: 'Permission denied. You do not own this pipeline.' }, { status: 403 });
    }

    db.prepare('DELETE FROM pipelines WHERE id = ?').run(id);
    logAudit(session.id, 'PIPELINE_DELETED', { pipelineId: id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Pipeline Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
fs.appendFileSync('src/app/api/pipelines/route.ts', code);
