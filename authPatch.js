const fs = require('fs');
let code = fs.readFileSync('src/lib/auth.ts', 'utf8');

code = code.replace(/const JWT_SECRET = process\.env\.JWT_SECRET \|\| 'super_secret_architect_key_change_me_in_prod';/,
`const crypto = require('crypto');
const fsModule = require('fs');
let JWT_SECRET = process.env.JWT_SECRET;
try {
  JWT_SECRET = JWT_SECRET || fsModule.readFileSync('./.jwt_secret', 'utf8');
} catch (e) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  fsModule.writeFileSync('./.jwt_secret', JWT_SECRET);
}`);

fs.writeFileSync('src/lib/auth.ts', code);
