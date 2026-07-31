import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { id, name, nodes, edges } = await req.json();
    
    if (!id || !name) {
      return NextResponse.json({ error: "Missing pipeline id or name" }, { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO pipelines (id, name, nodes, edges, updated_at) 
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET 
        name = excluded.name, 
        nodes = excluded.nodes, 
        edges = excluded.edges,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(id, name, JSON.stringify(nodes), JSON.stringify(edges));

    db.prepare("INSERT INTO audit_logs (pipeline_id, event, metadata) VALUES (?, ?, ?)")
      .run(id, "PIPELINE_SAVED", JSON.stringify({ nodesCount: nodes.length }));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save Pipeline Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const pipeline = db.prepare("SELECT * FROM pipelines WHERE id = ?").get(id);
      return NextResponse.json({ success: true, pipeline });
    } else {
      const pipelines = db.prepare("SELECT id, name, updated_at FROM pipelines ORDER BY updated_at DESC").all();
      return NextResponse.json({ success: true, pipelines });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
