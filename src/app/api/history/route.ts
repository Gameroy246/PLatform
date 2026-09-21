import { NextResponse } from 'next/server';
import dbConfig from '@/lib/db';

export async function GET() {
  try {
    const logs = dbConfig.prepare('SELECT * FROM execution_logs ORDER BY created_at DESC LIMIT 50').all();
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
