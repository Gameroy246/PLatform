# Local Data Architect

A local-first visual data engineering platform. Build, profile, and compile complex SQL pipelines natively in your browser using DuckDB, without ever sending sensitive data to the cloud.

## Overview

Local Data Architect addresses a specific problem for data teams: the need to design robust data transformations quickly while strictly maintaining data privacy. By running an embedded analytical database (DuckDB) locally within the Node environment, the application provides the power of a modern data warehouse without the security risks of external SaaS platforms.

## Core Capabilities

- **Visual DAG Builder:** Design directed acyclic graphs for data extraction, joining, aggregation, and cleaning. The UI relies on React Flow to manage node relationships visually.
- **Local-First Privacy:** Data never leaves your machine. Uploaded files are immediately encrypted on disk (AES-256-GCM) and decrypted ephemerally in-memory only during query execution.
- **Production SQL Compiler:** The platform is not just a sandbox; it serves as a visual compiler. It topologically sorts your graph and generates a production-ready Common Table Expression (CTE) query formatted for Snowflake, BigQuery, or dbt.
- **Live Column Profiling:** As you build, the platform runs background statistical profiling on your data. Select any node to see instant, computed summaries for null percentages, unique values, and bounds on every column.
- **Time-Travel Debugger:** The execution engine materializes each step into temporary tables. Clicking any historical node instantly fetches that exact step's data state, making it easy to isolate and debug transformation logic.
- **Pipeline Templates:** Teams can standardize their workflows by highlighting groups of nodes and saving them as reusable snippets, which can be dropped into any project without ID collisions.

## Architecture

The system operates entirely via stateless Next.js API routes interacting with the local DuckDB instance:
1. **Canvas State:** React Flow manages the DAG state on the client.
2. **Execution Engine (`/api/run`):** When executed, the graph is compiled into nested `CREATE TEMP TABLE` DuckDB statements and executed sequentially. 
3. **Profiling Engine (`/api/preview`):** Fetches sample data and dynamically runs `SUMMARIZE` to return rich column statistics.
4. **Security Layer:** File paths mapped in the UI are intercepted by `decryptSqlPaths` to decrypt data instantly into DuckDB memory spaces and clean up temporary buffers afterward.

## Getting Started

### Prerequisites
- Node.js 18+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Gameroy246/PLatform.git
cd PLatform
```

2. Install the dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Navigate to `http://localhost:3000` in your web browser.

## Contributing

Review the `CONTRIBUTING.md` guidelines if you want to submit a pull request. For bug reports or feature requests, please use the GitHub issue tracker.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
