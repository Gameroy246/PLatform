const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectDashboard.tsx', 'utf8');

code = code.replace(/\{user\?\.role === 'SUPERUSER' && \(/, 
  "{(user?.role === 'SUPERUSER' || user?.role === 'ADMIN') && (");

code = code.replace(/\{\(p\.owner_id === user\?\.id \|\| user\?\.role === 'SUPERUSER'\) && \(/, 
  "{(p.owner_id === user?.id || user?.role === 'SUPERUSER' || user?.role === 'ADMIN') && (");

code = code.replace(/\{p\.owner_id === user\?\.id && \(/, 
  "{(p.owner_id === user?.id || user?.role === 'SUPERUSER' || user?.role === 'ADMIN') && (");

fs.writeFileSync('src/components/ProjectDashboard.tsx', code);
