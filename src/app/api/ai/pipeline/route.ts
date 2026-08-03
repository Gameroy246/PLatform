import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });

    const systemPrompt = `You are a data engineering AI assistant. You generate React Flow pipelines (nodes and edges) for a visual SQL ETL tool.
Available node operations (dataSource types): csvInput, jsonInput, parquetInput, postgresInput, mysqlInput, mongodbInput, restApiInput, etc.
Available node operations (transform types): removeNulls, removeDuplicates, innerJoin, leftJoin, groupBy, sort, filterRows, regexMatch, autoMap, mathFormula, etc.
Available node operations (export types): exportCsv, exportJson, exportParquet.

Respond ONLY with valid JSON. Do not include markdown blocks like \`\`\`json.
Return an object with "nodes" and "edges" arrays.
Each node must have: id, type ('dataSource', 'transform'), position: {x,y}, data: { label, operation, sql (if transform), file (if input) }.
Each edge must have: id, source, target.
Example:
{
  "nodes": [
    { "id": "n1", "type": "dataSource", "position": { "x": 100, "y": 100 }, "data": { "label": "Read Users", "operation": "csvInput", "file": "users.csv" } },
    { "id": "n2", "type": "transform", "position": { "x": 400, "y": 100 }, "data": { "label": "Drop Nulls", "operation": "removeNulls", "sql": "SELECT * FROM {parent} WHERE id IS NOT NULL" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2" }
  ]
}
Generate a pipeline for this user request: "${prompt}"`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text().trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    return NextResponse.json({ success: true, pipeline: JSON.parse(responseText) });
  } catch (error: any) {
    console.error("AI Pipeline Generation Error:", error);
    return NextResponse.json({ error: error.message || "AI failed to generate pipeline." }, { status: 500 });
  }
}
