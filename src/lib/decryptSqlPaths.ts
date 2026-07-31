import { decryptFile } from './encryption';
import path from 'path';
import fs from 'fs';
import os from 'os';

export function decryptSqlPaths(sql: string): { modifiedSql: string, tempFiles: string[] } {
  const encFiles = [...sql.matchAll(/'([^']+?\.enc)'/g)].map(m => m[1]);
  if (encFiles.length === 0) return { modifiedSql: sql, tempFiles: [] };

  let modifiedSql = sql;
  const tempFiles: string[] = [];

  for (const encFile of encFiles) {
    if (fs.existsSync(encFile)) {
      // Create a temporary plaintext file
      const tempPath = path.join(os.tmpdir(), `decrypted_${Math.random().toString(36).substring(7)}_${path.basename(encFile).replace('.enc', '.csv')}`);
      decryptFile(encFile, tempPath);
      tempFiles.push(tempPath);
      // Safely replace the encrypted path with the temporary decrypted path
      modifiedSql = modifiedSql.split(encFile).join(tempPath.replace(/\\/g, '/'));
    } else {
      throw new Error(`Data Source Error: File "${path.basename(encFile)}" could not be found. It may have been deleted or moved. Please re-upload.`);
    }
  }

  return { modifiedSql, tempFiles };
}

export function cleanupTempFiles(tempFiles: string[]) {
  tempFiles.forEach(f => {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch(e) {
      console.error("Failed to delete temp file:", f);
    }
  });
}
