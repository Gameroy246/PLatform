<div align="center">
  <h1>Local Data Architect 🏗️</h1>
  <p><b>Enterprise-grade, local-first visual SQL pipeline builder powered by DuckDB and Next.js.</b></p>
</div>

<br />

Local Data Architect solves a critical enterprise problem: building robust data transformations without exposing sensitive datasets to cloud SaaS platforms. This tool gives you the power of a modern data engineering pipeline (joins, aggregations, data quality monitoring, profiling) entirely in your browser, running strictly on your local machine.

##  Enterprise Features (V3)

- **AES-256-GCM Encryption at Rest:** Any file uploaded to the application is immediately encrypted on disk using AES-256-GCM. Decryption only occurs ephemerally in-memory during DuckDB execution.
- **Blazing Fast Local Execution:** Runs natively on your local machine using the Node DuckDB engine. It safely processes massive datasets by leveraging DuckDB's disk-spilling architecture strictly capped at a 384MB memory limit.
- **DuckDB Profiling Engine:** Select any node to instantly view statistical data profiles generated via DuckDB's `SUMMARIZE` functionality (min, max, null percentages, distinct counts).
- **Cryptographic Split Streams:** The Data Quality node implements cryptographic delimiter strings (`___LDA_DATA_QUALITY_SPLIT___`) to securely split valid and invalid data streams without risk of SQL injection.
- **Topological DAG Safety:** Advanced graph algorithms strictly enforce acyclic structures. If a circular dependency is detected, the engine halts the graph securely without server crashes.
- **Linear-Style UI:** Beautiful, minimalist UI leveraging `zinc` palettes, refined typography (Inter font), and sleek structural cards.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository
```bash
git clone https://github.com/Gameroy246/PLatform.git
cd PLatform
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

##  Architecture Overview

The system operates in a stateless, reactive loop:
1. **The Canvas (`React Flow`)** manages the Directed Acyclic Graph (DAG) state and auto-saves to a local SQLite vault.
2. **The Schema Engine (`/api/schema`)** topologically sorts the graph and evaluates all upstream parents to resolve exact column types.
3. **The Profiling Engine (`/api/profile`)** dynamically runs `SUMMARIZE` to display rich data health metrics.
4. **The Execution Engine (`/api/run`)** compiles the final graph into nested `CREATE TEMP TABLE` DuckDB statements, seamlessly decrypts data on the fly, and executes sequentially.

##  Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md). 

For bugs or feature requests, use the GitHub issue templates provided.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
