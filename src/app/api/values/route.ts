import { NextResponse } from "next/server";
import { getDb, resetDb } from "../../../lib/duckdb";

export async function POST(req: Request) {
  try {
    const { targetNodeId, targetColumn, edges } = await req.json();
    if (!targetNodeId || !targetColumn) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const db = await getDb();
    const conn = db.connect();

    const parents = (edges || []).filter((e: any) => e.target === targetNodeId);
    if (parents.length === 0) {
      return NextResponse.json({ success: true, values: [] });
    }

    const parentId = parents[0].source;
    let safeParentName = `node_${parentId.replace(/-/g, '_')}`;
    if (parents[0].sourceHandle === 'error') {
       safeParentName += '_error';
    }

    const cleanCol = targetColumn.replace(/"/g, '""');

    const values = await new Promise<any[]>((resolve, reject) => {
      conn.all(`SELECT DISTINCT "${cleanCol}" as val FROM ${safeParentName} WHERE "${cleanCol}" IS NOT NULL LIMIT 100`, (err, res) => {
        if (err) {
             if (err.message.includes("does not exist")) {
                 return resolve([]);
             }
             reject(err);
        } else resolve(res);
      });
    });

    return NextResponse.json({ success: true, values: values.map(v => v.val) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
