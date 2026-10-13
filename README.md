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
  - **SQL Injection AST Taint Analyzer**: Detects raw string concatenations and AST taint patterns.
  - **Live GitHub Repository Auditor**: Shallow-clones public GitHub repositories on-demand to perform full-codebase static AST security scans.
  - **Dynamic Database Hardening Auditor**: Connects live to user-provided MySQL instances (custom host, port, credentials) to audit TLS encryption, administrative wildcards, and user privilege postures.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Flow, Monaco Editor, Lucide Icons, Axios.
- **Backend**: Node.js, Express, TypeScript, `node-sql-parser`, `natural` (NLP tokenization & stemming), `mysql2`, `@google/genai`.
- **Database**: MySQL 8.0+.
- **DevOps**: Multi-stage Dockerfile, Docker Compose, Render Blueprint, Vercel SPA configuration.

---

## 📦 Deployment Options

### Option 1: Docker Compose (Recommended for Local / VPS Deployment)

Run the full application including MySQL with a single command:

1. Create a `.env` file in the root directory (or copy `.env.example`):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. Start the services:
   ```bash
   docker compose up --build -d
   ```
3. Access the studio at `http://localhost:5000`.

---

### Option 2: 1-Click Free Cloud Deploy on Render (Unified Full-Stack)

The backend Express server is configured to serve the production Vite frontend build directly under one port and URL.

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit for Intelligent DBMS Studio"
   git remote add origin https://github.com/<your-username>/intelligent-dbms-studio.git
   git push -u origin main
   ```
2. In [Render Dashboard](https://dashboard.render.com):
   - Click **New** > **Blueprint**.
   - Select your GitHub repository.
   - Render will detect `render.yaml` and configure the Web Service automatically.
3. Add your Environment Variables:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (e.g. from Aiven, Railway, or AWS RDS MySQL).
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

### Option 4: Split Hosting (Vercel Frontend + Render/Railway Backend)

If you prefer hosting the frontend on Vercel and the backend on Render/Railway:

1. **Backend**:
   - Root directory: `backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Set environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `GEMINI_API_KEY`).
2. **Frontend**:
   - Deploy `frontend/` to Vercel.
   - Set Environment Variable in Vercel:
     ```env
     VITE_API_BASE_URL=https://your-backend-api.onrender.com
     ```
   - Client-side routes are preconfigured in `frontend/vercel.json`.

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port for Express server | `5000` |
| `DB_HOST` | MySQL hostname | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `""` |
| `DB_NAME` | MySQL database name | `dbms_studio` |
| `DB_SSL` | Enable TLS (`true`/`false`) | `false` |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `VITE_API_BASE_URL` | Base API URL (for split frontend) | `""` (relative `/api`) |

---

## 📄 License
MIT License.
