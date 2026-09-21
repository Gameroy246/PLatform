import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'system.db');
const isFirstRun = !fs.existsSync(dbPath);

export const db = new Database(dbPath, { timeout: 8000 });
db.pragma('journal_mode = WAL');

try {
  try { db.exec('ALTER TABLE users ADD COLUMN force_password_change INTEGER DEFAULT 0'); } catch(e) {}
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'VIEWER',
      mfa_secret TEXT,
      mfa_enabled INTEGER DEFAULT 0,
      reset_token TEXT,
      reset_expires INTEGER,
      features TEXT DEFAULT '[]', -- JSON array of accessible features
      force_password_change INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data TEXT NOT NULL, -- JSON payload of nodes and edges
      shared_with TEXT DEFAULT '[]', -- JSON array of user IDs
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create default superuser
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, role, features)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run('user_superuser', 'admin@architect.local', defaultPassword, 'SUPERUSER', '["all"]');
} catch(e) {
  console.warn("SQLITE_BUSY skipped during build");
}

export function logAudit(userId: string | null, action: string, details: any = {}) {
  const stmt = db.prepare(`INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)`);
  stmt.run(userId, action, JSON.stringify(details));
}
