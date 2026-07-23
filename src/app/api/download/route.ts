import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WORKSPACE_DIR = path.join(os.tmpdir(), "LocalDataArchitect_Workspace");

function streamFile(filePath: string): ReadableStream {
  const nodeStream = fs.createReadStream(filePath);
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: any) => controller.enqueue(new Uint8Array(chunk)));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('file');

    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    const filePath = path.join(WORKSPACE_DIR, filename);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(WORKSPACE_DIR)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const webStream = streamFile(filePath);

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": filename.endsWith('.parquet') ? "application/vnd.apache.parquet" : filename.endsWith('.json') ? "application/json" : "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": stat.size.toString(),
      }
    });

  } catch (error: any) {
    console.error("Download Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
