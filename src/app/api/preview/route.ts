import { NextResponse } from "next/server";
import duckdb from "duckdb";

export async function POST(req: Request) {
  try {
    const { nodes, edges, targetNodeId, previewStream = 'success' } = await req.json();
    if (!nodes || !Array.isArray(nodes) || !targetNodeId) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const db = new duckdb.Database(':memory:', {
      "allow_unsigned_extensions": "false"
    });
    const conn = db.connect();

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

    const upstreamNodes = new Set<string>();
    const stack = [targetNodeId];
    upstreamNodes.add(targetNodeId);
    
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

    // Execute the required DAG up to and INCLUDING the target node
    let allTempFiles: string[] = [];
    
    for (const nodeId of sortedNodes) {
      if (!upstreamNodes.has(nodeId)) continue;
      
      let sql = nodeMap[nodeId] || "SELECT 'Disconnected' AS status";
      
      const { decryptSqlPaths } = await import('@/lib/decryptSqlPaths');
      const { modifiedSql, tempFiles } = decryptSqlPaths(sql);
      allTempFiles.push(...tempFiles);
      
      const safeNodeName = `node_${nodeId.replace(/-/g, '_')}`;
      const sqlParts = modifiedSql.split('___LDA_DATA_QUALITY_SPLIT___');
      
      await new Promise<void>((resolve, reject) => {
        conn.exec(`CREATE TEMP TABLE ${safeNodeName} AS (${sqlParts[0]})`, (err: any) => {
          if (err) reject(new Error(`Error at Node ${nodeId}: ${err.message}`));
          else resolve();
        });
      });

      if (sqlParts.length > 1) {
        await new Promise<void>((resolve, reject) => {
          conn.exec(`CREATE TEMP TABLE ${safeNodeName}_error AS (${sqlParts[1]})`, (err: any) => {
            if (err) reject(new Error(`Error at Node ${nodeId} (Error Stream): ${err.message}`));
            else resolve();
          });
        });
      }
    }

    const targetSafeName = `node_${targetNodeId.replace(/-/g, '_')}${previewStream === 'error' ? '_error' : ''}`;
    
    const result = await new Promise<any[]>((resolve, reject) => {
      conn.all(`SELECT * FROM ${targetSafeName} LIMIT 200`, (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    const schema = await new Promise<any[]>((resolve, reject) => {
      conn.all(`DESCRIBE ${targetSafeName}`, (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    conn.close();
    
    try {
      const { cleanupTempFiles } = await import('@/lib/decryptSqlPaths');
      cleanupTempFiles(allTempFiles);
    } catch(e) {}
    
    const columns = schema.map(col => ({ name: col.column_name, type: col.column_type }));

    const serializeObj = (obj: any) => JSON.parse(JSON.stringify(obj, (k, v) => typeof v === 'bigint' ? Number(v) : v));
    return NextResponse.json(serializeObj({ 
      success: true, 
      preview: {
        columns,
        sample_data: result
      }
    }));

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate preview." }, { status: 500 });
  }
}
