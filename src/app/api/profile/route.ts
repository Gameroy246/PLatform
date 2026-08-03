import { NextResponse } from "next/server";
import duckdb from "duckdb";
import fs from "fs";

export async function POST(req: Request) {
  let allTempFiles: string[] = [];
  try {
    const { nodes, edges, targetNodeId } = await req.json();
    if (!nodes || !Array.isArray(nodes) || !targetNodeId) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const db = new duckdb.Database(':memory:', { "allow_unsigned_extensions": "false" });
    const conn = db.connect();
    conn.exec("PRAGMA memory_limit='384MB'");
    conn.exec("PRAGMA threads=1");

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
      return NextResponse.json({ error: "Invalid Pipeline: Circular dependency detected." }, { status: 400 });
    }

    const stack = [targetNodeId];
    const upstreamNodes = new Set<string>();
    upstreamNodes.add(targetNodeId);
    
    // Reverse adjacency list for upstream traversal
    const revAdjList: Record<string, string[]> = {};
    edges?.forEach((e: any) => {
      if (!revAdjList[e.target]) revAdjList[e.target] = [];
      revAdjList[e.target].push(e.source);
    });

    while (stack.length > 0) {
      const curr = stack.pop()!;
      revAdjList[curr]?.forEach(parent => {
        if (!upstreamNodes.has(parent)) {
          upstreamNodes.add(parent);
          stack.push(parent);
        }
      });
    }

    const nodeHashes: Record<string, string> = {};

    for (const nodeId of sortedNodes) {
      if (!upstreamNodes.has(nodeId)) continue;
      
      let sql = nodeMap[nodeId] || "SELECT 'Disconnected' AS status";
      
      const { generateNodeHash, getCacheFilePath, isEncryptedCached, getEncryptedCacheFilePath } = await import('@/lib/cachingEngine');
      const { encryptFile, decryptFile } = await import('@/lib/encryption');
      
      const parentHashes = (revAdjList[nodeId] || []).map(p => nodeHashes[p]);
      const nodeHash = generateNodeHash(sql, parentHashes);
      nodeHashes[nodeId] = nodeHash;

      const safeNodeName = `node_${nodeId.replace(/-/g, '_')}`;
      
      if (isEncryptedCached(nodeHash)) {
        const encCachePath = getEncryptedCacheFilePath(nodeHash);
        const tempCachePath = getCacheFilePath(nodeHash + "_temp.parquet");
        decryptFile(encCachePath, tempCachePath);
        allTempFiles.push(tempCachePath);
        
        await new Promise<void>((resolve, reject) => {
          conn.exec(`CREATE TEMP TABLE ${safeNodeName} AS SELECT * FROM read_parquet('${tempCachePath.replace(/\\/g, '/')}')`, (err: any) => {
            if (err) reject(err); else resolve();
          });
        });
      } else {
        const { decryptSqlPaths } = await import('@/lib/decryptSqlPaths');
        const { modifiedSql, tempFiles } = decryptSqlPaths(sql);
        allTempFiles.push(...tempFiles);
        const sqlParts = modifiedSql.split('___LDA_DATA_QUALITY_SPLIT___');
        
        await new Promise<void>((resolve, reject) => {
          conn.exec(`CREATE TEMP TABLE ${safeNodeName} AS (${sqlParts[0]})`, (err: any) => {
            if (err) reject(err); else resolve();
          });
        });
      }
    }

    const targetSafeName = `node_${targetNodeId.replace(/-/g, '_')}`;
    
    // DuckDB SUMMARIZE command provides min, max, approx_unique, null_percentage, etc.
    const result = await new Promise<any[]>((resolve, reject) => {
      conn.all(`SUMMARIZE ${targetSafeName}`, (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    conn.close();
    
    try {
      const { cleanupTempFiles } = await import('@/lib/decryptSqlPaths');
      cleanupTempFiles(allTempFiles);
    } catch(e) {}
    
    const serializeObj = (obj: any) => JSON.parse(JSON.stringify(obj, (k, v) => typeof v === 'bigint' ? Number(v) : v));
    return NextResponse.json(serializeObj({ 
      success: true, 
      profile: result
    }));

  } catch (error: any) {
    try {
      const { cleanupTempFiles } = await import('@/lib/decryptSqlPaths');
      cleanupTempFiles(allTempFiles);
    } catch(e) {}
    console.error("Profile API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate profile." }, { status: 500 });
  }
}
