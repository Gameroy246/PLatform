import { NextResponse } from "next/server";
import duckdb from "duckdb";
import fs from "fs";
import path from "path";
import os from "os";

// Map workspace to OS temporary directory for Render/Vercel compatibility
const WORKSPACE_DIR = path.join(os.tmpdir(), "LocalDataArchitect_Workspace");

export async function POST(req: Request) {
  let allTempFiles: string[] = [];
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

    // Load spatial extension only if pipeline uses Excel input (st_read)
    const needsSpatial = nodes.some((n: any) => n.sql?.includes('st_read'));
    if (needsSpatial) {
      try {
        conn.exec("INSTALL spatial");
        conn.exec("LOAD spatial");
      } catch(e) { /* extension may already be loaded */ }
    }

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

    if (sortedNodes.length !== nodes.length) {
      return NextResponse.json({ error: "Invalid Pipeline: Circular dependency detected. Nodes cannot form a closed loop." }, { status: 400 });
    }

    // Reverse adjacency list for easy upstream traversal (used for caching)
    const revAdjList: Record<string, string[]> = {};
    edges?.forEach((e: any) => {
      if (!revAdjList[e.target]) revAdjList[e.target] = [];
      revAdjList[e.target].push(e.source);
    });

    const nodeHashes: Record<string, string> = {};

    // Step 2: Execute the DAG sequentially in topological order
    for (const nodeId of sortedNodes) {
      const nodeStart = Date.now();
      finalNodeId = nodeId;
      let sql = nodeMap[nodeId] || "SELECT 'Disconnected' AS status";
      
      const { generateNodeHash, getCacheFilePath, isEncryptedCached, getEncryptedCacheFilePath } = await import('@/lib/cachingEngine');
      const { encryptFile, decryptFile } = await import('@/lib/encryption');
      
      const parentHashes = (revAdjList[nodeId] || []).map(p => nodeHashes[p]);
      const nodeHash = generateNodeHash(sql, parentHashes);
      nodeHashes[nodeId] = nodeHash;

      const safeNodeName = `node_${nodeId.replace(/-/g, '_')}`;
      
      if (isEncryptedCached(nodeHash)) {
        logs.push(`[${new Date().toISOString()}] Cache Hit for Node ${nodeId}. Loading from Vault...`);
        const encCachePath = getEncryptedCacheFilePath(nodeHash);
        const tempCachePath = getCacheFilePath(nodeHash + "_temp.parquet");
        decryptFile(encCachePath, tempCachePath);
        allTempFiles.push(tempCachePath);
        
        await new Promise<void>((resolve, reject) => {
          conn.exec(`CREATE TEMP TABLE ${safeNodeName} AS SELECT * FROM read_parquet('${tempCachePath.replace(/\\/g, '/')}')`, (err: any) => {
            if (err) reject(err); else resolve();
          });
        });

        // Load error cache if exists
        const encErrorCachePath = getEncryptedCacheFilePath(nodeHash + "_error");
        if (fs.existsSync(encErrorCachePath)) {
           const tempErrorCachePath = getCacheFilePath(nodeHash + "_error_temp.parquet");
           decryptFile(encErrorCachePath, tempErrorCachePath);
           allTempFiles.push(tempErrorCachePath);
           await new Promise<void>((resolve, reject) => {
             conn.exec(`CREATE TEMP TABLE ${safeNodeName}_error AS SELECT * FROM read_parquet('${tempErrorCachePath.replace(/\\/g, '/')}')`, (err: any) => {
               if (err) reject(err); else resolve();
             });
           });
        }

      } else {
        const { decryptSqlPaths } = await import('@/lib/decryptSqlPaths');
        const { modifiedSql, tempFiles } = decryptSqlPaths(sql);
        allTempFiles.push(...tempFiles);
        
        const sqlParts = modifiedSql.split('___LDA_DATA_QUALITY_SPLIT___');
        
        logs.push(`[${new Date().toISOString()}] Executing: CREATE TEMP TABLE ${safeNodeName} AS (...)`);
        console.log(`[API RUN] Executing Node ${nodeId}:\nCREATE TEMP TABLE ${safeNodeName} AS (${sqlParts[0]})`);
        await new Promise<void>((resolve, reject) => {
          conn.exec(`CREATE TEMP TABLE ${safeNodeName} AS (${sqlParts[0]})`, (err: any) => {
            if (err) reject(new Error(`Failed at Node ${nodeId}: ${err.message}`)); else resolve();
          });
        });

        if (sqlParts.length > 1) {
          logs.push(`[${new Date().toISOString()}] Executing: CREATE TEMP TABLE ${safeNodeName}_error AS (...)`);
          await new Promise<void>((resolve, reject) => {
            conn.exec(`CREATE TEMP TABLE ${safeNodeName}_error AS (${sqlParts[1]})`, (err: any) => {
              if (err) reject(new Error(`Failed at Error Stream ${nodeId}: ${err.message}`)); else resolve();
            });
          });
        }

        // Save Cache
        const rawCachePath = getCacheFilePath(nodeHash);
        await new Promise<void>((resolve, reject) => {
            conn.exec(`COPY (SELECT * FROM ${safeNodeName}) TO '${rawCachePath.replace(/\\/g, '/')}' (FORMAT PARQUET)`, (err: any) => {
                if (err) reject(err); else resolve();
            });
        });
        encryptFile(rawCachePath, getEncryptedCacheFilePath(nodeHash));
        fs.unlinkSync(rawCachePath);

        // Save Error Cache if exists
        if (sqlParts.length > 1) {
          const rawErrorCachePath = getCacheFilePath(nodeHash + "_error");
          await new Promise<void>((resolve, reject) => {
              conn.exec(`COPY (SELECT * FROM ${safeNodeName}_error) TO '${rawErrorCachePath.replace(/\\/g, '/')}' (FORMAT PARQUET)`, (err: any) => {
                  if (err) reject(err); else resolve();
              });
          });
          encryptFile(rawErrorCachePath, getEncryptedCacheFilePath(nodeHash + "_error"));
          fs.unlinkSync(rawErrorCachePath);
        }
      }
    }

    if (!finalNodeId) {
      throw new Error("Pipeline is empty or disconnected.");
    }

    // Step 3: Fetch result from the final node in the DAG
    const finalSafeName = `node_${finalNodeId.replace(/-/g, '_')}`;
    const result = await new Promise<any[]>((resolve, reject) => {
      conn.all(`SELECT * FROM ${finalSafeName} LIMIT 500`, (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    // Get actual total row count (not limited)
    const totalRowCount = await new Promise<number>((resolve, reject) => {
      conn.all(`SELECT COUNT(*) AS cnt FROM ${finalSafeName}`, (err: any, res: any) => {
        if (err) resolve(result.length);
        else resolve(Number(res[0]?.cnt || result.length));
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

    // Generate Explain Plan
    let explainPlanText = '';
    try {
      const explainResult = await new Promise<any[]>((resolve, reject) => {
        conn.all(`EXPLAIN SELECT * FROM ${finalSafeName}`, (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
      explainPlanText = explainResult.map((row: any) => Object.values(row).join(' ')).join('\n');
    } catch (e) {
      explainPlanText = 'Failed to generate explain plan.';
    }

    // Get column metadata for the output
    let columns: any[] = [];
    try {
      const colResult = await new Promise<any[]>((resolve, reject) => {
        conn.all(`DESCRIBE ${finalSafeName}`, (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
      columns = colResult.map((row: any) => ({ name: row.column_name, type: row.column_type }));
    } catch (e) {}

    const serializeObj = (obj: any) => JSON.parse(JSON.stringify(obj, (k, v) => typeof v === 'bigint' ? Number(v) : v));
    
    return NextResponse.json(serializeObj({ 
      success: true, 
      message: "Pipeline executed successfully.",
      metadata: { row_count: totalRowCount, sample_count: result.length, column_count: columns.length, columns, memory_limit: "384MB", threads: 1, duration_ms: duration },
      sample_result: result,
      final_sql: nodeMap[finalNodeId] || '',
      logs: logs,
      explain_plan: explainPlanText,
      download_url: `/api/download?file=${outputFilename}`
    }));

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  } finally {
    try {
      const { cleanupTempFiles } = await import('@/lib/decryptSqlPaths');
      cleanupTempFiles(allTempFiles);
    } catch(e) {}
  }
}
