import { NextResponse } from "next/server";
import duckdb from "duckdb";
import fs from "fs";
import path from "path";
import os from "os";

// Map workspace to OS temporary directory for Render/Vercel compatibility
const WORKSPACE_DIR = path.join(os.tmpdir(), "LocalDataArchitect_Workspace");

export async function POST(req: Request) {
  try {
    // Ensure workspace exists to prevent config crash
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }

    // Parse Pipeline Nodes and Edges
    const { nodes, edges, output_format = 'csv' } = await req.json();
    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    // Initialize Secure Sandboxed DuckDB
    const db = new duckdb.Database(':memory:', {
      "allow_unsigned_extensions": "false"
    });

    const conn = db.connect();

    // Enforce Resource Exhaustion Limits (512MB Server Profile)
    conn.exec("PRAGMA memory_limit='384MB'");
    conn.exec("PRAGMA threads=1");

    const logs: string[] = [];
    const startTime = Date.now();
    let finalNodeId = "";

    // Step 1: Topological Sort of the DAG
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};
    const nodeMap: Record<string, string> = {};

    nodes.forEach((n: any) => {
      inDegree[n.id] = 0;
      adjList[n.id] = [];
      let sql = n.sql;
      nodeMap[n.id] = sql;
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

    // Step 2: Execute the DAG sequentially in topological order
    for (const nodeId of sortedNodes) {
      finalNodeId = nodeId;
      const sql = nodeMap[nodeId];
      if (!sql || sql === "SELECT 'Disconnected' AS status") continue;
      
      const safeNodeName = `node_${nodeId.replace(/-/g, '_')}`;
      const createTableSql = `CREATE TEMP TABLE ${safeNodeName} AS (${sql})`;
      
      logs.push(`[${new Date().toISOString()}] Executing: ${createTableSql}`);
      
      await new Promise<void>((resolve, reject) => {
        conn.exec(createTableSql, (err: any) => {
          if (err) {
            logs.push(`[ERROR] Failed at Node ${nodeId}: ${err.message}`);
            reject(new Error(`Failed at Node ${nodeId}: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
    }

    if (!finalNodeId) {
      throw new Error("Pipeline is empty or disconnected.");
    }

    // Step 3: Fetch result from the final node in the DAG
    const finalSafeName = `node_${finalNodeId.replace(/-/g, '_')}`;
    const result = await new Promise<any[]>((resolve, reject) => {
      conn.all(`SELECT * FROM ${finalSafeName} LIMIT 100`, (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    // Step 4: Export the final result to requested format
    const ext = output_format.toLowerCase();
    const outputFilename = `output_${Date.now()}.${ext}`;
    const outputPath = path.join(WORKSPACE_DIR, outputFilename);
    await new Promise<void>((resolve, reject) => {
      let copyQuery = `COPY (SELECT * FROM ${finalSafeName}) TO '${outputPath}' (HEADER, DELIMITER ',')`;
      if (ext === 'parquet') copyQuery = `COPY (SELECT * FROM ${finalSafeName}) TO '${outputPath}' (FORMAT PARQUET)`;
      if (ext === 'json') copyQuery = `COPY (SELECT * FROM ${finalSafeName}) TO '${outputPath}' (FORMAT JSON, ARRAY TRUE)`;
      
      conn.exec(copyQuery, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    logs.push(`[${new Date().toISOString()}] Pipeline completed in ${duration}ms`);

    return NextResponse.json({ 
      success: true, 
      message: "Pipeline executed successfully.",
      metadata: { row_count: result.length, memory_limit: "384MB", threads: 1, duration_ms: duration },
      sample_result: result,
      logs: logs.join('\n'),
      download_url: `/api/download?file=${outputFilename}`
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
