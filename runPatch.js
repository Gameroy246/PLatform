const fs = require('fs');
let code = fs.readFileSync('src/app/api/run/route.ts', 'utf8');

if (!code.includes('generateNodeSQL')) {
  // Imports
  code = code.replace(/import \{ getDb, resetDb, runExec \} from "\.\.\/\.\.\/\.\.\/lib\/duckdb";/,
`import { getDb, resetDb, runExec } from "../../../lib/duckdb";
import { generateNodeSQL } from "../../../lib/sqlGenerator";`);

  // Rate Limiter
  code = code.replace(/export async function POST\(req: Request\) \{/,
`const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitData = rateLimitMap.get(ip);
  if (!limitData) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 10000 }); // 10 sec window
    return true;
  }
  if (now > limitData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 10000 });
    return true;
  }
  if (limitData.count > 5) {
    return false; // Throttled max 5 runs per 10s
  }
  limitData.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many pipeline executions. Please wait.' }, { status: 429 });
    }
`);

  // Generate SQL dynamically on backend!
  code = code.replace(/nodeMap\[n\.id\] = n\.sql;/, `nodeMap[n.id] = generateNodeSQL(n, edges);`);
  
  // Clean up n.sql in extensions load
  code = code.replace(/if \(n\.sql\?\.includes\('mysql_scan'\)\) extensionsToLoad\.add\('mysql'\);/g, `if (generateNodeSQL(n, edges)?.includes('mysql_scan')) extensionsToLoad.add('mysql');`);
  code = code.replace(/if \(n\.sql\?\.includes\('postgres_scan'\)\) extensionsToLoad\.add\('postgres'\);/g, `if (generateNodeSQL(n, edges)?.includes('postgres_scan')) extensionsToLoad.add('postgres');`);
  code = code.replace(/if \(n\.sql\?\.includes\('sqlite_scan'\)\) extensionsToLoad\.add\('sqlite'\);/g, `if (generateNodeSQL(n, edges)?.includes('sqlite_scan')) extensionsToLoad.add('sqlite');`);
  code = code.replace(/if \(n\.sql\?\.includes\('read_json_auto\('\) && n\.sql\?\.includes\('http'\)\) extensionsToLoad\.add\('httpfs'\);/g, `if (generateNodeSQL(n, edges)?.includes('read_json_auto(') && generateNodeSQL(n, edges)?.includes('http')) extensionsToLoad.add('httpfs');`);
  code = code.replace(/const needsSpatial = nodes\.some\(\(n: any\) => n\.sql\?\.includes\('st_read'\)\);/, `const needsSpatial = nodes.some((n: any) => generateNodeSQL(n, edges)?.includes('st_read'));`);
  
  // finalSql return
  code = code.replace(/const finalSql = nodes\.find\(\(n: any\) => n\.id === finalNodeId\)\?\.sql \|\| '';/,
    `const finalSql = nodes.find((n: any) => n.id === finalNodeId) ? generateNodeSQL(nodes.find((n: any) => n.id === finalNodeId), edges) : '';`);

  fs.writeFileSync('src/app/api/run/route.ts', code);
}
