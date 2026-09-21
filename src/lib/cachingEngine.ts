import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CACHE_DIR = path.join(os.tmpdir(), "LocalDataArchitect_Cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function generateNodeHash(sql: string, parentHashes: string[]): string {
  const hash = crypto.createHash('sha256');
  hash.update(sql);
  parentHashes.forEach(p => hash.update(p));
  return hash.digest('hex');
}

export function getCacheFilePath(hash: string): string {
  // We use Parquet for caching as it is heavily optimized for DuckDB
  return path.join(CACHE_DIR, `${hash}.parquet`);
}

export function isCached(hash: string): boolean {
  return fs.existsSync(getCacheFilePath(hash));
}

// Optionally, we could encrypt the cache as well, but DuckDB can write Parquet.
// Since we promised military-grade security, we should encrypt the cache!
// We'll let DuckDB write the plaintext Parquet, then encrypt it, then delete plaintext.
import { encryptFile, decryptFile } from './encryption';

export function getEncryptedCacheFilePath(hash: string): string {
  return path.join(CACHE_DIR, `${hash}.parquet.enc`);
}

export function isEncryptedCached(hash: string): boolean {
  return fs.existsSync(getEncryptedCacheFilePath(hash));
}
