import { NextResponse } from "next/server"; // Auto-reload trigger
import duckdb from "duckdb";
import fs from "fs";
import path from "path";
import os from "os";
import { mapDuckDBError } from "../../../lib/errorMapper";
import { getDb, resetDb } from "../../../lib/duckdb";

export async function POST(req: Request) {
  try {
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();
    if (session?.role === 'VIEWER') {
       return NextResponse.json({ error: "Permission denied. Viewers cannot preview data." }, { status: 403 });
    }

    const { targetNodeId, previewStream = 'success' } = await req.json();
    if (!targetNodeId) {
      return NextResponse.json({ error: "Invalid payload. targetNodeId is required." }, { status: 400 });
    }

    const db = await getDb();
    const conn = db.connect();

    let safeNodeName = `node_${targetNodeId.replace(/-/g, '_')}`;
    if (previewStream === 'error') {
      safeNodeName += '_error';
    }

    const tableExists = await new Promise<boolean>((resolve) => {
      conn.all(`SELECT table_name FROM information_schema.tables WHERE table_name = '${safeNodeName}'`, (err, res) => {
        resolve(!err && res && res.length > 0);
      });
    });

    if (!tableExists) {
       return NextResponse.json({ preview: { sample_data: [], columns: [], summary: [] } });
    }

    const previewData = await new Promise<any[]>((resolve, reject) => {
      conn.all(`SELECT * FROM ${safeNodeName} LIMIT 100`, (err, res) => {
        if (err) reject(err); else resolve(res);
      });
    });

    const columns = await new Promise<any[]>((resolve) => {
      conn.all(`DESCRIBE SELECT * FROM ${safeNodeName}`, (err, res) => {
        if (err) resolve([]); else resolve(res);
      });
    });

    const summary = await new Promise<any[]>((resolve) => {
      conn.all(`SUMMARIZE SELECT * FROM ${safeNodeName}`, (err, res) => {
        if (err) resolve([]); else resolve(res);
      });
    });

    return NextResponse.json({ 
      preview: {
        sample_data: previewData,
        columns: columns.map(c => ({ name: c.column_name, type: c.column_type })),
        summary: summary
      }
    });
  } catch (error: any) {
    console.error('[DuckDB Fatal Error /api/preview]:', error);
    const { message, raw, code } = mapDuckDBError(error);
    if (code === 'CONNECTION_LOST' || code === 'FATAL_DATA_CORRUPTION') {
      resetDb();
    }
    return NextResponse.json({ error: message, details: raw, code }, { status: 500 });
  }
}
