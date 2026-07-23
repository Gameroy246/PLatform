import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import * as xlsx from "xlsx";

const WORKSPACE_DIR = path.join(os.tmpdir(), "LocalDataArchitect_Workspace");

export async function POST(req: Request) {
  try {
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create a safe, unique filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFilename = `${Date.now()}-${safeName}`;
    const destinationPath = path.join(WORKSPACE_DIR, uniqueFilename);
    
    let finalPath = destinationPath;
    let headers: string[] = [];

    const ext = path.extname(file.name).toLowerCase();

    if (ext === ".xlsx" || ext === ".xls") {
      // Safely convert Excel to CSV on the fly to prevent DuckDB memory crashes
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const csvData = xlsx.utils.sheet_to_csv(sheet);
      
      finalPath = destinationPath.replace(/\.xlsx?$/i, ".csv");
      fs.writeFileSync(finalPath, csvData);
      
      const firstLine = csvData.split('\n')[0] || '';
      headers = firstLine.split(',').map(h => h.trim());
    } else {
      fs.writeFileSync(destinationPath, buffer);
      
      if (ext === ".csv") {
        const firstLine = buffer.toString('utf-8').split('\n')[0] || '';
        headers = firstLine.split(',').map(h => h.trim());
      }
    }

    return NextResponse.json({ 
      success: true, 
      path: finalPath,
      headers: headers,
      message: ext === ".xlsx" ? "Excel file securely converted to CSV format." : "File uploaded securely to workspace."
    });

  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
