import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import * as xlsx from "xlsx";

const WORKSPACE_DIR = path.join(os.homedir(), ".architect");

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
    
    const ext = path.extname(file.name).toLowerCase();
    const finalExt = ext === ".xlsx" || ext === ".xls" ? ".csv" : ext;
    const finalPath = destinationPath.replace(/\.[^/.]+$/, "") + finalExt;
    let headers: string[] = [];

    if (ext === ".xlsx" || ext === ".xls") {
      const workbook = xlsx.read(buffer, { type: "buffer", raw: true, cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const csvData = xlsx.utils.sheet_to_csv(sheet, { blankrows: true, rawNumbers: false });
      
      fs.writeFileSync(finalPath, csvData);
      
      const rows = csvData.split('\n');
      if (rows.length > 0) headers = rows[0].split(',').map(h => h.replace(/^["']|["']$/g, ''));
    } else {
      fs.writeFileSync(finalPath, buffer);
      
      if (ext === '.csv') {
          const lines = buffer.toString('utf-8').split('\n');
          if (lines.length > 0) headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, ''));
      } else if (ext === '.json') {
          try {
              const data = JSON.parse(buffer.toString('utf-8'));
              if (Array.isArray(data) && data.length > 0) headers = Object.keys(data[0]);
              else if (typeof data === 'object') headers = Object.keys(data);
          } catch(e) {}
      }
    }

    return NextResponse.json({
      success: true,
      path: finalPath,
      name: file.name,
      size: buffer.length,
      headers: headers
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
