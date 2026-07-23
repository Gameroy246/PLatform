import { NextResponse } from "next/server";
import duckdb from "duckdb";

export async function POST(req: Request) {
  try {
    const { nodes, edges, targetNodeId, columnName } = await req.json();
    if (!nodes || !Array.isArray(nodes) || !targetNodeId || !columnName) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const db = new duckdb.Database(':memory:', {
      "allow_unsigned_extensions": "false"
    });
    const conn = db.connect();

    conn.exec("PRAGMA memory_limit='384MB'");
    conn.exec("PRAGMA threads=1");

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

    const parents = (edges || []).filter((e: any) => e.target === targetNodeId).map((e: any) => e.source);
    if (parents.length === 0) {
      return NextResponse.json({ success: true, values: [] });
    }

    const upstreamNodes = new Set<string>();
    const stack = [...parents];
    parents.forEach((p: string) => upstreamNodes.add(p));
    
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

    for (const nodeId of sortedNodes) {
      if (!upstreamNodes.has(nodeId)) continue;
      
      const sql = nodeMap[nodeId];
      if (!sql || sql === "SELECT 'Disconnected' AS status") continue;
      
      const safeNodeName = `node_${nodeId.replace(/-/g, '_')}`;
      const createTableSql = `CREATE TEMP TABLE ${safeNodeName} AS (${sql})`;
      
      await new Promise<void>((resolve, reject) => {
        conn.exec(createTableSql, (err: any) => {
          if (err) reject(new Error(`Schema Error at Node ${nodeId}: ${err.message}`));
          else resolve();
        });
      });
    }

    let extractedValues: any[] = [];
    for (const parentId of parents) {
      const parentSafeName = `node_${parentId.replace(/-/g, '_')}`;
      try {
        const result = await new Promise<any[]>((resolve, reject) => {
          conn.all(`SELECT DISTINCT "${columnName}" AS val FROM ${parentSafeName} WHERE "${columnName}" IS NOT NULL LIMIT 100`, (err: any, res: any) => {
            if (err) reject(err);
            else resolve(res);
          });
        });
        extractedValues = result.map(r => r.val);
        break; // Stop if we successfully fetched values from a parent
      } catch (e) {
        // If column doesn't exist in this parent (e.g. in a Join), try the next parent
      }
    }
    
    conn.close();
    
    return NextResponse.json({ 
      success: true, 
      values: extractedValues
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to extract values." }, { status: 500 });
  }
}
