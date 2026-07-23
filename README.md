# Data Architect 

A local-first, visual SQL pipeline builder powered by **DuckDB** and **Next.js**. 

I built Data Architect to solve a simple problem: I hate writing boilerplate SQL for basic data transformations, but I also hate uploading my sensitive datasets to cloud SaaS platforms. This tool gives you the power of a modern data engineering pipeline (joins, aggregations, type casting, filtering) entirely in your browser, running locally on your own machine.

##  Features

- **Blazing Fast Local Execution:** Runs entirely on your local machine using the native Node DuckDB engine. No cloud servers, no data privacy issues. It safely processes massive datasets by leveraging DuckDB's disk-spilling architecture within a 512MB RAM constraint.
- **Visual Node DAG:** Drag-and-drop interface powered by React Flow. Visually connect Data Sources to Transformations and watch your data flow.
- **Dynamic Schema Awareness:** As you build your pipeline, the backend continually evaluates your sub-graphs. Click on any node, and the UI will automatically populate dropdowns with the exact columns and data types available at that specific moment in the pipeline.
- **Dynamic Row Value Extraction:** Need to filter rows where `status = 'active'`? Don't type it out. The UI automatically queries DuckDB for a sample of the unique values in your column and gives you a dropdown to select from. 100% foolproof.
- **Excel Resurrection:** Safely parses heavy `.xlsx` files during upload and silently streams them into lightning-fast CSVs on disk so DuckDB can process them instantly without memory crashes.
- **Multi-File Arrays:** Upload 10 CSVs into a single node. The engine automatically handles array syntax (`read_csv_auto(['a.csv', 'b.csv'])`) to seamlessly union your data.
- **Format Exporter:** Export your final pipeline results to **CSV**, **JSON**, or **Parquet** on the fly.

##  Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/Architect.git
cd Architect
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture Overview

The system operates in a stateless, reactive loop:
1. **The Canvas (`React Flow`)** manages the Directed Acyclic Graph (DAG) state.
2. **The Schema Engine (`/api/schema`)** topologically sorts the graph and evaluates all upstream parents to resolve exact column types dynamically for the properties panel.
3. **The Value Engine (`/api/values`)** runs `SELECT DISTINCT` on upstream nodes to populate filter dropdowns with actual data.
4. **The Execution Engine (`/api/run`)** compiles the final graph into nested `CREATE TEMP TABLE` DuckDB statements and executes them sequentially.

## Built With

- [Next.js](https://nextjs.org/) (App Router)
- [DuckDB](https://duckdb.org/) (Node.js API)
- [React Flow](https://reactflow.dev/) (Visual DAG)
- [Lucide React](https://lucide.dev/) (Icons)
- [Tailwind CSS](https://tailwindcss.com/) (Styling)
- [XLSX](https://sheetjs.com/) (Excel conversion)

## Contributing
Feel free to open issues or submit pull requests. If you want to add a new Transformation Node, check out the `generateSQL` function inside `Canvas.tsx` to see how the queries are compiled.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
