import { NextResponse } from "next/server";
import { db, logAudit } from "@/lib/systemDb";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, nodes, edges } = await req.json();
    
    if (!id || !name) {
      return NextResponse.json({ error: "Missing pipeline id or name" }, { status: 400 });
    }

    const payload = JSON.stringify({ nodes, edges });

    // Check if pipeline exists
    const existing = db.prepare(`SELECT owner_id FROM pipelines WHERE id = ?`).get(id) as any;

    if (existing) {
      // Check permissions (must be owner OR SUPERUSER)
      if (existing.owner_id !== session.id && session.role !== 'SUPERUSER') {
         return NextResponse.json({ error: 'Permission denied. You do not own this pipeline.' }, { status: 403 });
      }
      
      db.prepare(`UPDATE pipelines SET name = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(name, payload, id);
    } else {
      db.prepare(`INSERT INTO pipelines (id, owner_id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
        .run(id, session.id, name, payload);
    }

    logAudit(session.id, "PIPELINE_SAVED", { pipelineId: id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save Pipeline Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const pipeline = db.prepare("SELECT * FROM pipelines WHERE id = ?").get(id) as any;
      if (!pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
      
      const sharedWith = JSON.parse(pipeline.shared_with || '[]');
      
      // Check read permission
      if (pipeline.owner_id !== session.id && session.role !== 'SUPERUSER' && !sharedWith.includes(session.id)) {
          return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }

      return NextResponse.json({ success: true, pipeline: { ...pipeline, data: JSON.parse(pipeline.data) } });
    } else {
      let pipelines;
      if (session.role === 'SUPERUSER') {
         pipelines = db.prepare("SELECT id, name, owner_id, updated_at FROM pipelines ORDER BY updated_at DESC").all();
      } else {
         pipelines = db.prepare(`
            SELECT id, name, owner_id, updated_at 
            FROM pipelines 
            WHERE owner_id = ? OR json_extract(shared_with, '$') LIKE ?
            ORDER BY updated_at DESC
         `).all(session.id, `%${session.id}%`);
      }
      return NextResponse.json({ success: true, pipelines });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
