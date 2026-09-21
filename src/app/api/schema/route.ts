import { NextResponse } from "next/server"; // Auto-reload trigger
import duckdb from "duckdb";
import fs from "fs";
import path from "path";
import os from "os";
import { mapDuckDBError } from "../../../lib/errorMapper";
import { getDb, resetDb } from "../../../lib/duckdb";

export async function POST(req: Request) {
  try {
    const { targetNodeId, edges } = await req.json();
    if (!targetNodeId || !edges) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const db = await getDb();
    const conn = db.connect();

    const parents = (edges || []).filter((e: any) => e.target === targetNodeId).map((e: any) => e.source);
    if (parents.length === 0) {
      return NextResponse.json({ success: true, schema: [] });
    }

    const schemas: any[] = [];
    for (const parentId of parents) {
       const safeParentName = `node_${parentId.replace(/-/g, '_')}`;
       try {
          const res = await new Promise<any[]>((resolve, reject) => {
             conn.all(`DESCRIBE SELECT * FROM ${safeParentName}`, (err, res) => {
                 if (err) reject(err); else resolve(res);
             });
          });
          const cols = res.map((r: any) => ({ name: r.column_name, type: r.column_type }));
          schemas.push({ nodeId: parentId, columns: cols });
       } catch (e: any) {
           if (!e.message.includes("does not exist")) {
               console.error(e);
           }
       }
    }

    return NextResponse.json({ success: true, schema: schemas });
  } catch (error: any) {
    console.error('[DuckDB Fatal Error /api/schema]:', error);
    const { message, raw, code } = mapDuckDBError(error);
    if (code === 'CONNECTION_LOST' || code === 'FATAL_DATA_CORRUPTION') {
      resetDb();
    }
    return NextResponse.json({ error: message, details: raw, code }, { status: 500 });
  }
}
