import { NextResponse } from "next/server"; // Auto-reload trigger
import duckdb from "duckdb";
import fs from "fs";
import path from "path";
import os from "os";
import { mapDuckDBError } from "../../../lib/errorMapper";
import { getDb, resetDb, runExec } from "../../../lib/duckdb";

// Persistent Database Directory
const WORKSPACE_DIR = path.join(os.homedir(), ".architect");

export async function POST(req: Request) {
  try {
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();
    if (session?.role === 'VIEWER') {
       return NextResponse.json({ error: "Permission denied. Viewers cannot execute pipelines." }, { status: 403 });
    }

    const { nodes, edges, output_format = 'csv' } = await req.json();
    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const db = await getDb();
    const conn = db.connect();

    await runExec(conn, `SET File_Search_Path='${WORKSPACE_DIR.replace(/\\/g, '/')}'`);

    // Load spatial extension only if pipeline uses Excel input (st_read)
    const needsSpatial = nodes.some((n: any) => n.sql?.includes('st_read'));
    if (needsSpatial) {
      try {
        await runExec(conn, "INSTALL spatial; LOAD spatial;");
      } catch(e) { }
    }

    // Ecosystem Extensions
    const extensionsToLoad = new Set<string>();
    nodes.forEach((n: any) => {
      if (n.sql?.includes('mysql_scan')) extensionsToLoad.add('mysql');
      if (n.sql?.includes('postgres_scan')) extensionsToLoad.add('postgres');
      if (n.sql?.includes('sqlite_scan')) extensionsToLoad.add('sqlite');
      if (n.sql?.includes('read_json_auto(') && n.sql?.includes('http')) extensionsToLoad.add('httpfs');
    });

    for (const ext of extensionsToLoad) {
      try {
        await runExec(conn, `INSTALL ${ext}; LOAD ${ext};`);
      } catch(e) { }
    }

    const logs: string[] = [];
    const startTime = Date.now();
    let finalNodeId = "";
    const nodeMetrics: Record<string, { duration_ms: number, cached: boolean }> = {};

    // Topological Sort
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};
    const nodeMap: Record<string, string> = {};

    nodes.forEach((n: any) => {
      inDegree[n.id] = 0;
      adjList[n.id] = [];
      nodeMap[n.id] = n.sql;
    });

    edges?.forEach((e: any) => {
      if (adjList[e.source] && inDegree[e.target] !== undefined) {
        adjList[e.source].push(e.target);
        inDegree[e.target]++;
      }
    });

    const queue: string[] = [];
    Object.keys(inDegree).forEach(id => {
      if (inDegree[id] === 0) queue.push(id);
    });

    const sortedNodes: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      sortedNodes.push(curr);
      adjList[curr]?.forEach(neighbor => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) queue.push(neighbor);
      });
    }

    if (sortedNodes.length !== nodes.length) {
      return NextResponse.json({ error: "Invalid Pipeline: Circular dependency detected." }, { status: 400 });
    }

    for (const nodeId of sortedNodes) {
      const nodeStart = Date.now();
      finalNodeId = nodeId;
      let sql = nodeMap[nodeId] || "SELECT 'Disconnected' AS status";
      const safeNodeName = `node_${nodeId.replace(/-/g, '_')}`;

      // Handle custom Data Quality split node
      if (sql.includes('___LDA_DATA_QUALITY_SPLIT___')) {
        const parts = sql.split('___LDA_DATA_QUALITY_SPLIT___');
        const passSql = parts[0];
        const failSql = parts[1];
        await new Promise<void>((resolve, reject) => {
          conn.exec(`CREATE OR REPLACE TABLE ${safeNodeName} AS ${passSql}`, (err) => {
            if (err) return reject(err);
            conn.exec(`CREATE OR REPLACE TABLE ${safeNodeName}_error AS ${failSql}`, (err2) => {
              if (err2) return reject(err2);
              resolve();
            });
          });
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          conn.exec(`CREATE OR REPLACE TABLE ${safeNodeName} AS ${sql}`, (err: any) => {
            if (err) reject(err); else resolve();
          });
        });
      }

      nodeMetrics[nodeId] = { duration_ms: Date.now() - nodeStart, cached: false };
      logs.push(`[${new Date().toISOString()}] Executed Node ${nodeId} (${nodeMetrics[nodeId].duration_ms}ms)`);
    }

    if (!finalNodeId) {
      return NextResponse.json({ message: "Empty pipeline" });
    }

    const finalTableName = `node_${finalNodeId.replace(/-/g, '_')}`;
    
    let summary: any[] = [];
    try {
      summary = await new Promise<any[]>((resolve) => {
        conn.all(`SUMMARIZE SELECT * FROM ${finalTableName}`, (err, res) => {
          if (err) resolve([]); else resolve(res);
        });
      });
    } catch(e) {}

    let columns: any[] = [];
    try {
      columns = await new Promise<any[]>((resolve) => {
        conn.all(`DESCRIBE SELECT * FROM ${finalTableName}`, (err, res) => {
          if (err) resolve([]); else resolve(res);
        });
      });
    } catch (e) {}

    let rowCount = 0;
    try {
      const countRes: any = await new Promise((resolve) => {
        conn.all(`SELECT COUNT(*) as c FROM ${finalTableName}`, (err, res) => {
           if (err) resolve([{c:0}]); else resolve(res);
        });
      });
      rowCount = Number(countRes[0].c);
    } catch(e) {}

    const previewData = await new Promise<any[]>((resolve, reject) => {
      conn.all(`SELECT * FROM ${finalTableName} LIMIT 100`, (err, res) => {
        if (err) reject(err); else resolve(res);
      });
    });

    let downloadUrl = null;
    try {
      const outputFilename = `output_${Date.now()}.${output_format}`;
      const outputPath = path.join(WORKSPACE_DIR, outputFilename);
      
      let copyQuery = `COPY (SELECT * FROM ${finalTableName}) TO '${outputPath.replace(/\\/g, '/')}'`;
      if (output_format === 'csv') copyQuery += ` (HEADER, DELIMITER ',')`;
      if (output_format === 'parquet') copyQuery += ` (FORMAT PARQUET)`;
      if (output_format === 'json') copyQuery += ` (ARRAY TRUE)`;

      await new Promise<void>((resolve, reject) => {
        conn.exec(copyQuery, (err) => {
          if (err) reject(err); else resolve();
        });
      });
      downloadUrl = `/api/download?file=${outputFilename}`;
    } catch (e) {
      logs.push(`[ERROR] Export failed: ${e}`);
    }

    const totalDuration = Date.now() - startTime;
    logs.push(`[${new Date().toISOString()}] Pipeline finished in ${totalDuration}ms`);

    const node_statuses: Record<string, any> = {};
    for (const [id, metric] of Object.entries(nodeMetrics)) {
       node_statuses[id] = { status: 'COMPLETED', duration_ms: (metric as any).duration_ms };
    }

    const finalSql = nodes.find((n: any) => n.id === finalNodeId)?.sql || '';

    return NextResponse.json({
      success: true,
      message: "Pipeline executed successfully",
      download_url: downloadUrl,
      sample_result: previewData,
      final_sql: finalSql,
      logs: logs,
      node_statuses: node_statuses,
      metadata: {
        row_count: rowCount,
        column_count: columns.length,
        columns: columns.map(c => ({ name: c.column_name, type: c.column_type })),
        summary,
        metrics: nodeMetrics,
        total_duration_ms: totalDuration
      }
    });

  } catch (error: any) {
    console.error('[DuckDB Fatal Error /api/run]:', error);
    const { message, raw, code } = mapDuckDBError(error);
    if (code === 'CONNECTION_LOST' || code === 'FATAL_DATA_CORRUPTION') {
      resetDb();
    }
    return NextResponse.json({ error: message, details: raw, code }, { status: 500 });
  }
}
