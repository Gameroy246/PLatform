const fs = require('fs');
let code = fs.readFileSync('src/lib/systemDb.ts', 'utf8');

if (!code.includes('force_password_change')) {
  code = code.replace(/features TEXT DEFAULT '\[\]', -- JSON array of accessible features/, 
    `features TEXT DEFAULT '[]', -- JSON array of accessible features\n      force_password_change INTEGER DEFAULT 0`);
  code = code.replace(/try \{\n\s*\/\/ Create tables/, 
    `try {\n  try { db.exec('ALTER TABLE users ADD COLUMN force_password_change INTEGER DEFAULT 0'); } catch(e) {}\n  // Create tables`);
  fs.writeFileSync('src/lib/systemDb.ts', code);
}
