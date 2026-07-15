# Local Data Architect 🚀

Local Data Architect is a powerful, standalone ETL (Extract, Transform, Load) platform that brings Tableau-level data processing directly to your local machine.

## ✨ Features
* **30+ Powerful Data Nodes:** Drag and drop nodes for Input, Cleaning, Transformation, Aggregation, and Export.
* **Lightning Fast:** Powered by DuckDB for blazing fast in-memory SQL execution.
* **Pandas Excel Engine:** Native support for `.xlsx` and `.xls` files.
* **Interactive Dashboard:** Auto-generates Bar, Line, Scatter, and Pie charts directly from your data using Recharts.
* **Schema Preview:** Peek into the exact column schema and top 10 rows of any node in your pipeline.
* **Standalone Executable:** Run the entire application natively on Windows with zero dependencies.

## 🚀 How to Run

### Option 1: Standalone Windows Executable (Recommended)
1. Download the latest `LocalDataArchitect.exe` from the [Releases](#) page.
2. Double-click the `.exe` file.
3. The server will start in a terminal window, and your browser will automatically open the application!

### Option 2: Run from Source
If you are a developer and want to run the code locally:

1. **Install Dependencies:**
   ```bash
   cd frontend
   npm install
   
   cd ../backend
   pip install -r requirements.txt # (duckdb, pandas, fastapi, uvicorn, openpyxl, google-genai)
   ```

2. **Start the Application:**
   From the root folder, run the orchestrator script:
   ```bash
   python run.py
   ```
   This will simultaneously boot up the Vite frontend and FastAPI backend.

## 🛠️ Building the Executable
If you modify the source code and want to generate a new `.exe` file:
```bash
python build_exe.py
```
This script will compile the React frontend, package the Python backend with PyInstaller, and output a fresh `LocalDataArchitect.exe` in the root folder.
