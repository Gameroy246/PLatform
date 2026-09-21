import duckdb from "duckdb";
import fs from "fs";
import path from "path";
import os from "os";

// Fix for "Do not know how to serialize a BigInt" in JSON.stringify
if (typeof (BigInt.prototype as any).toJSON === 'undefined') {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

const WORKSPACE_DIR = path.join(os.homedir(), ".architect");
const DB_PATH = path.join(WORKSPACE_DIR, "workspace.duckdb");

let dbInstance: duckdb.Database | null = null;

export const getDb = async () => {
  if (!dbInstance) {
    dbInstance = new duckdb.Database(":memory:", {
      "allow_unsigned_extensions": "false"
    });
  }
  return dbInstance;
};

export const resetDb = () => {
  if (dbInstance) {
    try {
      // Ignore close errors, just wipe it
      (dbInstance as any).close();
    } catch (e) {}
  }
  dbInstance = null;
};

export const runExec = (c: any, query: string) => new Promise<void>((res, rej) => c.exec(query, (e: any) => e ? rej(e) : res()));
