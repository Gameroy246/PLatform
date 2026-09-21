const fs = require('fs');

let code = fs.readFileSync('src/components/Canvas.tsx', 'utf8');

code = code.replace(/const mappedNodes = nodes\.map\(n => \(\{ id: n\.id, sql: generateNodeSQL\(n, edges\) \}\)\);/g, '');
code = code.replace(/nodes: mappedNodes/g, 'nodes');
code = code.replace(/edges: mappedEdges/g, 'edges');

fs.writeFileSync('src/components/Canvas.tsx', code);
