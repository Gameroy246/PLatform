import { decryptFile } from './encryption';
import path from 'path';
import fs from 'fs';
import os from 'os';

export function decryptSqlPaths(sql: string): { modifiedSql: string, tempFiles: string[] } {
  let modifiedSql = sql;
  const tempFiles: string[] = [];

  // 1. Decrypt encrypted workspace files (.enc)
  const encFiles = [...sql.matchAll(/'([^']+?\.enc)'/g)].map(m => m[1]);
  for (const encFile of encFiles) {
    if (fs.existsSync(encFile)) {
      const tempPath = path.join(os.tmpdir(), `decrypted_${Math.random().toString(36).substring(7)}_${path.basename(encFile).replace('.enc', '.csv')}`);
      decryptFile(encFile, tempPath);
      tempFiles.push(tempPath);
      modifiedSql = modifiedSql.split(encFile).join(tempPath.replace(/\\/g, '/'));
    } else {
      throw new Error(`Data Source Error: File "${path.basename(encFile)}" could not be found. It may have been deleted or moved. Please re-upload.`);
    }
  }

  // 2. Validate unencrypted local files (e.g. D:/data/uncleaned.xlsx)
  const rawFileMatches = [...modifiedSql.matchAll(/(?:st_read|read_csv_auto|read_parquet|read_json_auto)\s*\(\s*'([^']+)'/gi)];
  for (const m of rawFileMatches) {
    const rawPath = m[1];
    if (rawPath && !rawPath.startsWith('http') && !fs.existsSync(rawPath)) {
      throw new Error(`Data Source Error: File not found at path "${rawPath}". Please verify the file exists on disk or browse to select a file.`);
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
