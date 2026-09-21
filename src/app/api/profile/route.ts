import { NextResponse } from "next/server";
import { getDb } from "../../../lib/duckdb";

export async function POST(req: Request) {
  try {
    const { targetNodeId } = await req.json();
    if (!targetNodeId) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const db = await getDb();
    const conn = db.connect();

    const safeNodeName = `node_${targetNodeId.replace(/-/g, '_')}`;

    let summary: any[] = [];
    try {
      summary = await new Promise<any[]>((resolve, reject) => {
        conn.all(`SUMMARIZE SELECT * FROM ${safeNodeName}`, (err, res) => {
          if (err) reject(err); else resolve(res);
        });
      });
    } catch(e: any) {
        if (e.message.includes("does not exist")) {
             return NextResponse.json({ summary: [], rowCount: 0 });
        }
        return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
    }

    let rowCount = 0;
    try {
      const countRes: any = await new Promise((resolve) => {
        conn.all(`SELECT COUNT(*) as c FROM ${safeNodeName}`, (err, res) => {
           if (err) resolve([{c:0}]); else resolve(res);
        });
      });
      rowCount = Number(countRes[0].c);
    } catch(e) {}

    return NextResponse.json({ summary, rowCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
