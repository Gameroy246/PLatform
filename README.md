# Local Data Architect

A secure, cloud-synced visual data engineering platform. Build, profile, and compile complex SQL pipelines in your browser using DuckDB — with multi-user authentication, role-based access control, and enterprise-grade security hardening.

---

## Overview

Local Data Architect addresses a critical need for data teams: the ability to design robust data transformations quickly while maintaining strict data privacy and multi-user collaboration. By running an embedded analytical database (DuckDB) within the Node.js runtime, the application provides the power of a modern data warehouse without the security risks of external SaaS platforms.

The platform operates as a **single-page application (SPA)** with a login → dashboard → canvas flow, and is deployable to platforms like **Render**, **Vercel**, or any Node.js host.

---

## Core Capabilities

### Visual Pipeline Builder
- **DAG Editor:** Design directed acyclic graphs for data extraction, joining, aggregation, filtering, and cleaning using a drag-and-drop React Flow canvas.
- **20+ Node Types:** CSV, Excel, JSON, Parquet, Avro, ORC inputs; SQL, Filter, Aggregate, Join, Union, Pivot, Sort, Deduplicate, Rename, Cast, Formula, Sample, and Custom SQL transforms.
- **Production SQL Compiler:** Topologically sorts your graph and generates production-ready CTE queries formatted for Snowflake, BigQuery, or dbt.
- **Live Column Profiling:** Background statistical profiling computes null percentages, unique values, min/max bounds, and data types for every column in real time.
- **Time-Travel Debugger:** The execution engine materializes each step into temporary tables. Click any historical node to inspect that exact step's data state.
- **Pipeline Templates:** Highlight groups of nodes and save them as reusable snippets that can be dropped into any project without ID collisions.

### Multi-User Authentication & Authorization
- **JWT-Based Sessions:** Secure, HTTP-only cookie authentication with auto-generated 256-bit cryptographic secrets.
- **Role-Based Access Control (RBAC):** Three roles — `SUPERUSER`, `ADMIN`, and `EDITOR` — each with different feature flags and permissions.
- **CAPTCHA on Login:** Server-generated CAPTCHA challenge to prevent automated brute-force attacks.
- **Forced Password Reset:** New accounts created by a Superuser are flagged to require a mandatory password change on first login.
- **Admin Panel:** Superusers and Admins can create, manage, and delete user accounts from a dedicated panel accessible from the Project Dashboard.

### Cloud Sync & Collaboration
- **Server-Side Pipeline Storage:** All pipelines are stored in a SQLite database on the server. Pipelines persist across browsers, devices, and sessions.
- **Pipeline Sharing:** Pipeline owners (and Superusers) can share individual canvases with specific users via a sharing modal.
- **Access-Controlled Reads:** Users only see pipelines they own or that have been explicitly shared with them. Superusers see all pipelines.
- **Auto-Save:** The canvas auto-saves pipeline state to the cloud on every significant change.

### Security Hardening
- **Rate Limiting:** In-memory rate limiters on `/api/run` and `/api/auth/login` to prevent DDoS and brute-force attacks (HTTP 429 responses).
- **Server-Side SQL Generation:** SQL is generated exclusively on the backend from node metadata. The frontend never sends raw SQL strings, eliminating SQL injection vectors.
- **Path Traversal Protection:** All file paths are sanitized (`file.split(/[/\\]/).pop()`) to prevent directory traversal attacks.
- **Formula Sanitization:** User-provided formulas are validated against a strict character whitelist and blocked from containing SQL keywords (`SELECT`, `DROP`, `DELETE`, etc.).
- **Cryptographic Secret Management:** JWT secrets are auto-generated using `crypto.randomBytes(32)` and persisted to `.jwt_secret` if no environment variable is provided.
- **RBAC Enforcement:** Every API endpoint validates the user session and role before executing, preventing privilege escalation and IDOR attacks.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js SPA (React)                     │
│  LoginScreen → ProjectDashboard → Canvas (React Flow DAG)   │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP (JSON)
┌──────────────────────────▼──────────────────────────────────┐
│                   Next.js API Routes                        │
│                                                             │
│  /api/auth/login    – JWT auth + CAPTCHA + rate limiting    │
│  /api/auth/me       – Session validation                    │
│  /api/auth/logout   – Cookie clearing                       │
│  /api/admin/users   – User CRUD (SUPERUSER/ADMIN only)      │
│  /api/pipelines     – Pipeline CRUD + access control        │
│  /api/pipelines/share – Pipeline sharing                    │
│  /api/run           – Pipeline execution (DuckDB)           │
│  /api/preview       – Live data preview + profiling         │
│  /api/upload        – File upload to workspace              │
│  /api/download      – File export                           │
│  /api/schema        – Column schema extraction              │
│  /api/history       – Execution history                     │
│  /api/values        – Distinct column values                │
└──────────┬─────────────────────────────┬────────────────────┘
           │                             │
    ┌──────▼──────┐              ┌───────▼───────┐
    │   DuckDB    │              │    SQLite      │
    │  (Analytics)│              │  (Users, Auth, │
    │             │              │   Pipelines,   │
    │             │              │   Audit Logs)  │
    └─────────────┘              └────────────────┘
```

1. **Canvas State:** React Flow manages the DAG state on the client.
2. **Execution Engine (`/api/run`):** Compiles the graph into nested `CREATE TEMP TABLE` DuckDB statements, executed in topological order.
3. **Profiling Engine (`/api/preview`):** Fetches sample data and runs `SUMMARIZE` to return rich column statistics.
4. **Auth Layer:** JWT tokens in HTTP-only cookies. Every API route calls `getSession()` to verify identity and role.
5. **System Database (SQLite):** Stores users, pipelines, sharing permissions, and audit logs.

---

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

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Superuser | `admin@architect.local` | `admin123` |

> **Important:** Change the default Superuser password immediately after first login.

### Environment Variables (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for signing JWT tokens | Auto-generated and persisted to `.jwt_secret` |
| `PORT` | Server port | `3000` |

---

## Deployment

The application is designed to be deployed on any Node.js hosting platform:

```bash
npm run build
npm start
```

Compatible with **Render**, **Railway**, **Fly.io**, **Vercel**, and standard VPS/Docker deployments.

---

## Contributing

Review the `CONTRIBUTING.md` guidelines if you want to submit a pull request. For bug reports or feature requests, please use the GitHub issue tracker.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
