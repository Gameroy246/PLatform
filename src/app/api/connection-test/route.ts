import { NextResponse } from "next/server";
import duckdb from "duckdb";

export async function POST(req: Request) {
  try {
    const { connectionString } = await req.json();
    if (!connectionString) {
      return NextResponse.json({ success: false, error: "Connection string missing" }, { status: 400 });
    }

    // Determine type
    let type = '';
    let attachQuery = '';
    
    if (connectionString.startsWith('postgresql://') || connectionString.startsWith('postgres://')) {
      type = 'POSTGRES';
      attachQuery = `ATTACH '${connectionString}' AS test_db (TYPE POSTGRES);`;
    } else if (connectionString.startsWith('mysql://')) {
      type = 'MYSQL';
      attachQuery = `ATTACH '${connectionString}' AS test_db (TYPE MYSQL);`;
    } else if (connectionString.startsWith('sqlite://')) {
      type = 'SQLITE';
      attachQuery = `ATTACH '${connectionString.replace('sqlite://', '')}' AS test_db (TYPE SQLITE);`;
    } else {
      // Default to trying as a file
      attachQuery = `ATTACH '${connectionString}' AS test_db;`;
    }

    return await new Promise<NextResponse>((resolve) => {
      const db = new duckdb.Database(':memory:', { "allow_unsigned_extensions": "false" });
      const conn = db.connect();
      
      try {
        if (type === 'POSTGRES') {
           conn.exec("INSTALL postgres");
           conn.exec("LOAD postgres");
        } else if (type === 'MYSQL') {
           conn.exec("INSTALL mysql");
           conn.exec("LOAD mysql");
        } else if (type === 'SQLITE') {
           conn.exec("INSTALL sqlite");
           conn.exec("LOAD sqlite");
        }
      } catch (e) {
        // extensions might already be installed
      }

      conn.exec(attachQuery, (err) => {
        if (err) {
          resolve(NextResponse.json({ success: false, error: err.message }));
        } else {
          // If attach succeeds, we can successfully connect. Clean up immediately.
          conn.exec("DETACH test_db;", () => {
            resolve(NextResponse.json({ success: true }));
          });
        }
      });
    });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
