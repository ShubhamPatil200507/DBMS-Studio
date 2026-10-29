# Intelligent DBMS Studio

An enterprise-grade, autonomous database engineering and optimization studio. Combines live AST parsing, deterministic relational algorithms, automated agent workflows, and AI assistance.

---

## 🚀 Core Features

- **AI Database Designer & ER Engine**: Transforms natural language descriptions into normalized schemas, table metadata, and interactive React Flow ER diagrams.
- **FD & Relational Normalization Analyzer**: Deterministic closure computation, candidate key discovery, and strict verification from 1NF through BCNF.
- **Autonomous Agent Workflow**: Multi-step optimization engine executing schema profiling, index selection, query rewriting, and change impact prediction.
- **AI SQL Assistant**: Context-aware SQL generation, natural language translation, and sandboxed query execution.
- **Query Performance & EXPLAIN Analyzer**: Visual query plan inspection, index usage diagnostics, and cost scoring.
- **Live Security & Audit Suite**:
  - **Lexical and Syntactic Security Scanner**: Detects raw string concatenations, unescaped template string interpolations, unconstrained DELETE operations, and hardcoded database credentials using deterministic regular-expression pattern scanning across code snippets and repositories. *(Note: The scanner uses high-throughput lexical pattern recognition; full-program static AST taint and inter-procedural dataflow analysis are not currently implemented).*
  - **Live GitHub Repository Auditor**: Shallow-clones public GitHub repositories on-demand to run multi-file lexical security audits with automated temporary directory cleanup.
  - **Administrative Database Hardening Auditor**: Connects securely to user-provided MySQL instances (strictly enforcing loopback/private host allowlists and valid database port ranges to prevent SSRF) to audit TLS encryption, administrative wildcards, and user privilege postures. Restricted exclusively to administrative users.

---

## 🛡️ Security Architecture & Resource Controls

- **Cryptographic JWT Authentication**:
  - Requires `JWT_SECRET` with a minimum length of 32 characters (256 bits).
  - Fails startup immediately if the secret is missing or insufficient; silent default signing keys are strictly prohibited.
  - Never prints or leaks secrets in error messages or application logs.
- **Access Control & Ownership Isolation**:
  - Multi-user isolation enforces project CRUD ownership via verified JWT tokens (`req.user.id`).
  - Cross-user resource access, modification, and deletion attempts are blocked with 404/403 responses.
  - Administrative capabilities (such as live database audits) require `req.user.role === 'admin'`.
- **SQL Execution Sandbox & Truthful Cancellation**:
  - Structural AST policy allowlist: permits safe `SELECT`, `WITH ... SELECT`, `SHOW`, `DESCRIBE`, and `EXPLAIN` statements.
  - Strictly blocks data-modifying CTEs (`WITH ... UPDATE`, `WITH ... DELETE`), multiple semicolon-separated statements, file export clauses (`INTO OUTFILE`, `INTO DUMPFILE`), and dangerous execution functions (`SLEEP`, `BENCHMARK`, `LOAD_FILE`, lock routines).
  - Query length capped at 5,000 characters; result rows truncated at 500 rows.
  - **Truthful Server-Side Query Cancellation**: Leases a dedicated MySQL connection, captures the server `threadId`, and attempts `KILL QUERY <threadId>` upon timeout (5,000ms). Truthfully distinguishes confirmed server cancellations from unconfirmed client socket terminations.
  - *Account Limitation*: Real server-side cancellation requires the MySQL account to own the connection thread or hold `CONNECTION_ADMIN`/`SYSTEM_USER` privileges. When executed on accounts lacking cancellation privileges, `KILL QUERY` fails and the client destroys the socket, truthfully reporting the cancellation as unconfirmed.
- **Resource Protection & Rate Limiting**:
  - Global API rate limiter: 300 requests / 15 minutes.
  - Authentication rate limiter (`/login`, `/register`): 20 requests / 15 minutes.
  - Expensive operations rate limiter (agent optimization, repository scans): 40 requests / 15 minutes.
  - Request body limit capped at 500 KB; global request timeout set to 30 seconds.

---

## 🔬 Empirical Research Benchmarks & Methodology

The repository includes a reproducible automated benchmarking harness (`npm run benchmark`) producing structured JSON and CSV artifacts in `backend/benchmark_results/`:

1. **Security Detection Benchmark (`benchmark_security.ts`)**:
   - Evaluates 50 independent, manually curated samples (25 positive vulnerability cases, 25 negative secure cases).
   - Computes precision, recall, specificity, and F1 score mathematically without hardcoding or synthetic metrics.
2. **Relational Normalization Benchmark (`benchmark_normalization.ts`)**:
   - Tests 15 canonical ground-truth relational schemas with functional dependencies.
   - Evaluates candidate key discovery exact matches and 1NF through BCNF classification accuracy.
3. **NL-to-SQL Intent & Schema Resolution Benchmark (`benchmark_nl2sql.ts`)**:
   - Evaluates 40 queries: 20 queries from the preserved original test set and 20 queries from a separate, unseen evaluation corpus.
   - Compares naive baseline keyword matching against schema-aware join path resolution and entity linking.
4. **Query Optimization & Database Rewrite Benchmark (`benchmark_query_optimization.ts`)**:
   - **Part A (AST Structural Analysis)**: In-process AST parsing latency measured via Node.js high-resolution timers (`performance.now()`). Evaluates 10 explicitly labeled test cases (5 positive concern queries, 5 negative clean queries), computing true positives, false positives, true negatives, false negatives, precision, recall, and F1 mathematically. Measures local JavaScript parser traversal time (~0.4–0.8 ms), strictly separate from database execution.
   - **Part B (Live Empirical MySQL Execution)**: Operates strictly within a newly allocated, uniquely named disposable database (`dbms_studio_benchmark_<runId>`). Checks that the database does not pre-exist (refuses to overwrite pre-existing databases), requires explicit dedicated benchmark credentials (`BENCHMARK_DB_USER`, `BENCHMARK_DB_PASSWORD`), executes a 1-query unmeasured warm-up pass, and guarantees cleanup only if this exact run confirmed creation.
   - **Collation-Sensitive Semantic Divergence**: The collation experiment demonstrates a semantic difference for the tested rewrite and configurations: eliminating `LOWER(status) = 'active'` $\rightarrow$ `status = 'active'` preserves result-set equivalence under case-insensitive collations (`utf8mb4_general_ci`), but produces silent data loss under case-sensitive/binary collations (`utf8mb4_bin`) by dropping mixed-case records (128 vs 42 rows). Note: This experiment demonstrates the semantic risk of naive function flattening in rewriters; the prototype optimizer does not currently implement dynamic schema-collation introspection.
   - **Dataset Scope & Limitations**: Workload tests run on a small synthetic dataset (300 customers, 600 orders) on MySQL 8.0.46. Latencies reflect in-memory InnoDB buffer pool operations and cannot be generalized to multi-gigabyte disk-bound workloads.

> [!NOTE]
> The project is currently an active empirical research prototype. It is not claimed to be fully secure or publication-ready, and should not be cited as final peer-reviewed findings.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Flow, Monaco Editor, Lucide Icons, Axios.
- **Backend**: Node.js (v20+ / v24+), Express 5, TypeScript, `node-sql-parser`, `natural` (NLP tokenization & stemming), `mysql2`, `@google/genai`, `express-rate-limit`, `jsonwebtoken`.
- **Database**: MySQL 8.0+.
- **DevOps**: Multi-stage Dockerfile, Docker Compose, Render Blueprint, Vercel SPA configuration.

---

## 📦 Deployment Options

### Option 1: Docker Compose (Recommended for Local / VPS Deployment)

Run the full application including MySQL with a single command:

1. Create a `.env` file in the root directory (or copy `.env.example`):
   ```env
   JWT_SECRET=your_secure_random_jwt_secret_at_least_32_characters_long
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. Start the services:
   ```bash
   docker compose up --build -d
   ```
3. Access the studio at `http://localhost:5000`.

---

### Option 2: 1-Click Cloud Deploy on Render (Unified Full-Stack)

The backend Express server is configured to serve the production Vite frontend build directly under one port and URL.

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat(security): apply audit remediations and benchmark harness"
   git push -u origin main
   ```
2. In [Render Dashboard](https://dashboard.render.com):
   - Click **New** > **Blueprint**.
   - Select your GitHub repository.
   - Render will detect `render.yaml` and configure the Web Service automatically.
3. Add your Environment Variables:
   - `JWT_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (MySQL 8.0+ instance).
   - `GEMINI_API_KEY`.
4. Deploy! Render will build the frontend and backend, serving both on your assigned `*.onrender.com` domain.

---

### Option 3: Unified Local Production Build

To run the unified production build on your machine without dev servers:

```bash
# 1. Install dependencies across backend & frontend
npm run install:all

# 2. Build both frontend and backend
npm run build

# 3. Initialize MySQL database schema
npm run init-db

# 4. Start production server
npm start
```

Visit `http://localhost:5000`.

---

## ⚙️ Environment Variables Reference

| Variable | Description | Required | Default |
|---|---|---|---|
| `PORT` | HTTP port for Express server | No | `5000` |
| `JWT_SECRET` | Cryptographic secret for signing JWTs (minimum 32 characters / 256 bits) | **Yes** | *None (Server fails startup if missing)* |
| `JWT_EXPIRES_IN` | JWT token expiration lifespan | No | `24h` |
| `DB_HOST` | MySQL hostname | No | `localhost` |
| `DB_PORT` | MySQL port | No | `3306` |
| `DB_USER` | MySQL username | No | `root` |
| `DB_PASSWORD` | MySQL password | No | `""` |
| `DB_NAME` | MySQL database name | No | `dbms_studio` |
| `DB_SSL` | Enable TLS (`true`/`false`) | No | `false` |
| `BENCHMARK_DB_NAME` | Disposable benchmark database base name | **Yes (for benchmarks)** | *None* |
| `BENCHMARK_DB_USER` | Dedicated benchmark database username | **Yes (for benchmarks)** | *None* |
| `BENCHMARK_DB_PASSWORD` | Dedicated benchmark database password | **Yes (for benchmarks)** | *None* |
| `GEMINI_API_KEY` | Google Gemini API key | Optional | - |
| `VITE_API_BASE_URL` | Base API URL (for split frontend hosting) | No | `""` (relative `/api`) |

### Generating a Secure JWT Secret
You can generate a cryptographically strong secret using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Running Automated Tests & Benchmarks

```bash
# Navigate to backend directory
cd backend

# Execute all unit, regression, and integration tests (111 tests across 20 suites)
npm test

# Execute empirical research benchmark suite
npm run benchmark
```

---

## 📄 License
MIT License.
