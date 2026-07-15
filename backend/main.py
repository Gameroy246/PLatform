from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import duckdb
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)
audit_handler = logging.FileHandler("audit.log")
audit_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
audit_logger.addHandler(audit_handler)

duck_conn = duckdb.connect(database=":memory:")

class Node(BaseModel):
    id: str
    sql: str = Field(..., description="SQL snippet for this node.")

class Edge(BaseModel):
    source: str
    target: str

class ExecuteRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

class AIGenerateRequest(BaseModel):
    target_node_id: str
    prompt: str
    api_key: str
    nodes: List[Node]
    edges: List[Edge]

def topological_sort(nodes: List[Node], edges: List[Edge]) -> List[Node]:
    node_map: Dict[str, Node] = {node.id: node for node in nodes}
    graph: Dict[str, List[str]] = {node.id: [] for node in nodes}
    indegree: Dict[str, int] = {node.id: 0 for node in nodes}
    
    for edge in edges:
        if edge.source not in graph or edge.target not in graph:
            raise HTTPException(status_code=400, detail=f"Edge refers to unknown node: {edge}")
        graph[edge.source].append(edge.target)
        indegree[edge.target] += 1
        
    queue: List[str] = [nid for nid, deg in indegree.items() if deg == 0]
    ordered: List[Node] = []
    
    while queue:
        current_id = queue.pop(0)
        ordered.append(node_map[current_id])
        for neighbor in graph[current_id]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
                
    if len(ordered) != len(nodes):
        raise HTTPException(status_code=400, detail="Cyclic dependency detected among nodes")
    return ordered

app = FastAPI(title="ETL Execution Engine", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/execute")
async def execute_etl(request: ExecuteRequest) -> Dict[str, Any]:
    ordered_nodes = topological_sort(request.nodes, request.edges)
    logs: List[str] = []
    node_statuses: Dict[str, Any] = {}

    view_name = lambda nid: f"node_{nid.replace('-', '_')}"

    for node in ordered_nodes:
        sql = node.sql.strip()
        
        if sql.startswith("__EXCEL__") or sql.startswith("__EXCEL_MULTI__"):
            import pandas as pd
            import glob
            import json
            
            try:
                if sql.startswith("__EXCEL_MULTI__"):
                    files_json = sql.replace("__EXCEL_MULTI__", "").strip()
                    all_files = json.loads(files_json)
                else:
                    file_path = sql.split("'")[1]
                    all_files = glob.glob(file_path)
                
                if not all_files:
                    raise Exception(f"No files found for node {node.id}")
                
                df_list = [pd.read_excel(f) for f in all_files]
                df = pd.concat(df_list, ignore_index=True)
                
                duck_conn.register(view_name(node.id), df)
                rows_processed = len(df)
                node_statuses[node.id] = {"status": "SUCCESS", "duration_ms": 100}
                logs.append(f"[SUCCESS] Imported Excel via Pandas to {view_name(node.id)} ({rows_processed} rows from {len(all_files)} files)")
                audit_logger.info(f"NODE_EXEC: {node.id} | DURATION: 100ms | ROWS: {rows_processed} | EXCEL: {file_path}")
                continue
            except Exception as e:
                node_statuses[node.id] = {"status": "ERROR", "duration_ms": 0, "error": str(e)}
                error_msg = f"[ERROR] Failed to read Excel file {file_path}: {e}"
                logs.append(error_msg)
                logger.exception(error_msg)
                raise HTTPException(status_code=500, detail=error_msg)

        sql_upper = sql.upper()
        allowed_starts = ("SELECT", "WITH", "PIVOT", "UNPIVOT", "SUMMARIZE")
        if not any(sql_upper.startswith(p) for p in allowed_starts):
            node_statuses[node.id] = {"status": "ERROR", "duration_ms": 0, "error": f"SQL must start with {', '.join(allowed_starts)}"}
            raise HTTPException(status_code=400, detail=f"SQL for node {node.id} must start with {', '.join(allowed_starts)}")
            
        forbidden_keywords = ["DROP ", "DELETE ", "UPDATE ", "INSERT ", "ALTER ", "TRUNCATE "]
        for keyword in forbidden_keywords:
            if keyword in sql_upper:
                node_statuses[node.id] = {"status": "ERROR", "duration_ms": 0, "error": f"Security Exception: {keyword.strip()} is not allowed."}
                audit_logger.warning(f"SECURITY BLOCKED: Node {node.id} attempted forbidden operation: {keyword.strip()}")
                raise HTTPException(status_code=403, detail=f"Security Exception: {keyword.strip()} operations are strictly forbidden in this ETL tool.")
        
        create_stmt = f"CREATE OR REPLACE VIEW {view_name(node.id)} AS {sql}"
        
        start_time = time.time()
        try:
            duck_conn.execute(create_stmt)
            duration_ms = int((time.time() - start_time) * 1000)
            
            row_count_res = duck_conn.execute(f"SELECT COUNT(*) FROM {view_name(node.id)}").fetchone()
            rows_processed = row_count_res[0] if row_count_res else 0
            
            node_statuses[node.id] = {"status": "SUCCESS", "duration_ms": duration_ms}
            logs.append(f"[SUCCESS] Created view {view_name(node.id)} in {duration_ms}ms ({rows_processed} rows)")
            
            audit_logger.info(f"NODE_EXEC: {node.id} | DURATION: {duration_ms}ms | ROWS: {rows_processed} | SQL: {sql}")
            logger.info("Created view %s", view_name(node.id))
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            node_statuses[node.id] = {"status": "ERROR", "duration_ms": duration_ms, "error": str(e)}
            error_msg = f"[ERROR] Failed to create view {view_name(node.id)}: {e}"
            logs.append(error_msg)
            logger.exception(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

    sources = {edge.source for edge in request.edges}
    final_nodes = [n for n in request.nodes if n.id not in sources]
    
    if not final_nodes:
        final_node = ordered_nodes[-1]
    else:
        final_node = final_nodes[0]

    final_sql = f"SELECT * FROM {view_name(final_node.id)}"
    
    try:
        col_info = duck_conn.execute(f"DESCRIBE {view_name(final_node.id)}").fetchall()
        columns = [{"name": row[0], "type": row[1]} for row in col_info]
        column_count = len(columns)
        
        row_count_res = duck_conn.execute(f"SELECT COUNT(*) FROM {view_name(final_node.id)}").fetchone()
        row_count = row_count_res[0] if row_count_res else 0

        result = duck_conn.execute(final_sql).fetchall()
        
        col_names = [c["name"] for c in columns]
        sample_data = [dict(zip(col_names, row)) for row in result[:100]]

        logs.append(f"[SUCCESS] Executed final query for node {final_node.id}")
    except Exception as e:
        logs.append(f"[ERROR] Final query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "logs": logs,
        "final_sql": final_sql,
        "sample_result": sample_data,
        "node_statuses": node_statuses,
        "metadata": {
            "row_count": row_count,
            "column_count": column_count,
            "columns": columns
        }
    }

@app.post("/api/ai/generate-sql")
async def ai_generate_sql(request: AIGenerateRequest) -> Dict[str, str]:
    if not request.api_key:
        raise HTTPException(status_code=401, detail="API Key is missing")
    
    parent_edges = [e for e in request.edges if e.target == request.target_node_id]
    if not parent_edges:
        raise HTTPException(status_code=400, detail="AI Node must be connected to a parent node.")
        
    parent_node_id = parent_edges[0].source
    parent_view = f"node_{parent_node_id.replace('-', '_')}"
    
    try:
        col_info = duck_conn.execute(f"DESCRIBE {parent_view}").fetchall()
        columns = [{"name": row[0], "type": row[1]} for row in col_info]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Please run the pipeline once so the AI can read the parent node's data schema. Error: {e}")

    schema_str = ", ".join([f"{c['name']} ({c['type']})" for c in columns])
    system_instruction = "You are an expert DuckDB SQL engineer. Output ONLY valid SQL. No markdown, no explanations. The query must start with SELECT."
    user_prompt = f"I have a table named `{parent_view}` with the following schema: {schema_str}.\n\nTask: {request.prompt}\n\nWrite the DuckDB SQL SELECT statement to accomplish this."
    
    try:
        from google import genai
        client = genai.Client(api_key=request.api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[system_instruction, user_prompt]
        )
        sql = response.text.strip()
        if sql.startswith("```sql"):
            sql = sql[6:]
        if sql.startswith("```"):
            sql = sql[3:]
        if sql.endswith("```"):
            sql = sql[:-3]
        return {"sql": sql.strip()}
    except Exception as e:
        logger.exception("AI Generation Failed")
        raise HTTPException(status_code=500, detail=f"AI Generation Failed: {e}")

@app.get("/api/browse-file")
def browse_file():
    import tkinter as tk
    from tkinter import filedialog
    
    root = tk.Tk()
    root.withdraw()
    
    root.attributes('-topmost', True)
    # Open the file dialog
    file_paths = filedialog.askopenfilenames(
        title="Select Data Files",
        filetypes=[
            ("Data Files", "*.csv *.json *.parquet *.xlsx *.xls"),
            ("All Files", "*.*")
        ]
    )
    
    root.destroy()
    
    if file_paths:
        if len(file_paths) == 1:
            return {"path": file_paths[0]}
        else:
            import json
            return {"path": json.dumps(file_paths)}
            
    return {"path": ""}

@app.get("/api/download/{view_name}")
def download_view(view_name: str):
    import tempfile
    import os
    from fastapi.responses import FileResponse
    
    if not view_name.startswith("node_"):
        raise HTTPException(status_code=400, detail="Invalid view name")
        
    tmp_path = os.path.join(tempfile.gettempdir(), f"{view_name}.csv")
    try:
        duck_conn.execute(f"COPY (SELECT * FROM {view_name}) TO '{tmp_path}' (HEADER, DELIMITER ',')")
        return FileResponse(tmp_path, filename=f"architect_{view_name}.csv", media_type="text/csv")
    except Exception as e:
        logger.exception("CSV Export Failed")
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV: {e}")

@app.get("/api/preview/{node_id}")
def preview_node(node_id: str):
    view_name = f"node_{node_id.replace('-', '_')}"
    try:
        col_info = duck_conn.execute(f"DESCRIBE {view_name}").fetchall()
        columns = [{"name": row[0], "type": row[1]} for row in col_info]
        
        result = duck_conn.execute(f"SELECT * FROM {view_name} LIMIT 10").fetchall()
        col_names = [c["name"] for c in columns]
        sample_data = [dict(zip(col_names, row)) for row in result]
        
        return {"columns": columns, "sample_data": sample_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Node has not been executed yet. Run Pipeline first. ({e})")

import sys
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

@app.get("/health")
async def health_check() -> Dict[str, str]:
    return {"status": "ok"}

if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
    frontend_dist = os.path.join(base_path, "dist")
else:
    base_path = os.path.dirname(os.path.abspath(__file__))
    frontend_dist = os.path.join(base_path, "..", "frontend", "dist")

if os.path.isdir(frontend_dist):
    logger.info(f"Serving static frontend from {frontend_dist}")
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    logger.warning("Frontend dist directory not found. Static UI will not be served.")

if __name__ == "__main__":
    import uvicorn
    import threading
    import webbrowser
    import time
    
    def open_browser():
        time.sleep(1.5)
        webbrowser.open("http://127.0.0.1:8000")
        
    print("Starting Local Data Architect Server...")
    print("Keep this window open while using the application.")
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)