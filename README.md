# QueryGen AI — RAG-Powered Natural Language to SQLite Query Agent 🚀

QueryGen AI is a production-ready SQL Query Agent that converts natural language questions into SQLite queries using RAG, Qdrant Cloud, local SQLite database schemas, and LLMs. It provides two core functions: SQL generation and safe SQL execution with chatbot-style result formats.

---

## ⭐ Unified Single-Page Flow

QueryGen AI includes a unified **Query Agent (Full Flow)** page (`/dashboard/query-agent`) that connects the complete user journey in a single interface:
1. **Upload SQLite Database**: Drag and drop or browse a `.db`, `.sqlite`, or `.sqlite3` database file (up to 50 MB).
2. **Extract & Index Schema**: Introspects table structures, generates embeddings using `fastembed` (`BAAI/bge-small-en-v1.5`), and uploads them to Qdrant Cloud under tenant-isolated IDs.
3. **Ask & Execute**: Ask natural language questions, review the generated SQL, copy with one click, or inspect tabular query results and RAG context chunks.

---

## ⭐ Two-Function Design

### Function 1 — Query Generation Mode  
**Endpoint**: `POST /api/generate-query`
```
Natural language 
  → RAG schema retrieval (retrieves table structures matching semantic search from Qdrant)
  → LLM SQL generation (Groq primary, Gemini fallback)
  → Backend validation
  → SQL output only (no execution)
```
*Returns: SQL query, explanation, tables used, confidence, schema context, and safety status.*

---

### Function 2 — Query Execution Mode  
**Endpoint**: `POST /api/generate-and-run`
```
Natural language 
  → Function 1 (re-uses generation pipeline)
  → Guardrail validation (verifies SELECT-only execution boundaries and blocks SQLite-specific administrative commands)
  → Limit injection (limits records dynamically)
  → Safe SELECT execution on the uploaded SQLite database file
  → Return SQL and result table rows
```
*Returns: SQL, explanation, columns, rows (as List[Dict]), row count, execution time, RAG context, and safety status.*

---

## 🛠️ Production Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Python 3.11+, FastAPI |
| **Validation** | Pydantic v2 |
| **Database Access** | SQLAlchemy 2.0 & sqlite3 (read-only mode) |
| **Platform Database** | Neon PostgreSQL (Authentication & Workspace Metadata) |
| **Vector Database** | Qdrant Cloud |
| **Embedding Engine** | FastEmbed (`BAAI/bge-small-en-v1.5`) |
| **LLM** | Groq (primary), Gemini (fallback) |
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Vanilla CSS + Tailwind CSS |
| **API Client** | Typed service layer (`src/services/api.ts`) |

> [!NOTE]
> GitHub may show more TypeScript than Python in repository statistics because this is a full-stack project with a React TypeScript frontend and a Python FastAPI backend.

---

## 🏗️ System Architecture

1. **Platform Database**:
   Neon PostgreSQL stores authentication, workspace metadata (file sizes, schema statuses), and query history.
2. **User Workspace Database**:
   Users upload their own SQLite database files. The backend stores them on disk (under isolated directories per user and workspace) and creates a read-only local database engine for safe schema introspection and query execution.
3. **Vector Database**:
   Qdrant stores schema embeddings for RAG.
   > [!NOTE]
   > Qdrant collections require payload indexes on `user_id` and `workspace_id` to allow strict tenant-isolating query filtering. The system automatically creates these indexes using `ensure_collection()`.

---

## ⚙️ Backend Setup & Configuration

### 1. Environment Variables
Create a `.env` file in the root directory:
```env
APP_NAME="QueryGen AI"
APP_ENV="development"
JWT_SECRET_KEY="your-jwt-secret-key"
DATABASE_URL="postgresql://username:password@host:5432/database"
QDRANT_URL="https://your-qdrant-cluster-url.qdrant.tech"
QDRANT_API_KEY="your-qdrant-api-key"
GROQ_API_KEY="your-groq-api-key"
GEMINI_API_KEY="your-gemini-api-key"
```

### 2. Install & Run
Navigate to the `backend/` directory:
```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 💻 Frontend Setup & Configuration

### 1. Environment Variables
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_BASE_URL="http://127.0.0.1:8000"
```

### 2. Install & Run
Navigate to the `frontend/` directory:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite local development server
npm run dev

# Compile production bundle
npm run build
```

---

## 🧠 Relational Grounding with Qdrant Cloud

1. Upload SQLite database files through the UI.
2. Introspect database schemas via SQLAlchemy (tables, columns, keys, and foreign relationships), excluding platform internal tables (`querygen_users`, `querygen_history`, `querygen_sqlite_workspaces`).
3. Convert schema metadata into text documents and generate embeddings using `fastembed` (`BAAI/bge-small-en-v1.5`).
4. Store embeddings and payloads in Qdrant Cloud.
5. Query Qdrant vector search to fetch schema context for every user question, and inject into LLM prompts.

---

## 🛡️ Security Wording & Guardrails

* **Read-only SQL execution**: Enforces strict SELECT query boundaries on local SQLite files.
* **SELECT-only guardrails**: Strips comments and blocks destructive SQL statements (DDL/DML mutations) at the code level.
* **No destructive SQL**: Immediate execution rejections of statements containing `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, or semicolon injections.
* **SQLite Administrative Block**: Rejects queries attempting to run administrative commands like `PRAGMA`, `ATTACH`, `DETACH`, `VACUUM`, `BEGIN`, `COMMIT`, `REINDEX`, etc.
* **Internal Schema Restrictions**: Strictly blocks and rejects queries attempting to select or reference platform tables (`querygen_users`, `querygen_history`, `querygen_sqlite_workspaces`, `users`).
* **JWT protected workspace**: User routing and history logs are secured via standard JWT Bearer token authentication.

---

## 📡 API Endpoints

| Method | Endpoint | Request Body | Description |
|--------|----------|--------------|-------------|
| `GET` | `/api/health` | - | Backend health check |
| `POST` | `/api/auth/signup` | `{"email": "...", "password": "..."}` | Register a new user |
| `POST` | `/api/auth/login` | `{"email": "...", "password": "..."}` | Log in and receive a JWT token |
| `GET` | `/api/auth/me` | - | Retrieve profile of the logged-in user |
| `POST` | `/api/sqlite/upload` | `file` (Multipart) | Upload a SQLite database file |
| `GET` | `/api/sqlite/active` | - | Retrieve active SQLite workspace metadata |
| `DELETE` | `/api/sqlite/active` | - | Remove active SQLite workspace from disk |
| `POST` | `/api/rag/ingest-schema` | - | Introspect active SQLite database schema → store in Qdrant |
| `GET` | `/api/rag/status` | - | Get RAG schema index status |
| `POST` | `/api/generate-query` | `{"question": "..."}` | Function 1: Generate SQL Only |
| `POST` | `/api/generate-and-run` | `{"question": "..."}` | Function 2: Generate + execute SQL |
| `GET` | `/api/history` | - | Get query history logs |
| `GET` | `/api/suggestions` | - | Fetch database schema-grounded suggestions |

---

## 🌐 Production Readiness & Render Deployment Notes

Because Render's free or basic web services use ephemeral file systems, local database files uploaded to the filesystem will be lost whenever the container scales down, restarts, or deploys new code.

To ensure uploaded SQLite workspace databases persist across restarts:
1. **Configure a Render Persistent Disk**:
   - In your Render Web Service dashboard, navigate to **Disks**.
   - Create a disk with name `sqlite-storage` and mount it at `/app/storage` (size: 10GB is recommended).
2. **Environment Variable Configuration**:
   - Set `SQLITE_STORAGE_DIR="/app/storage/sqlite_workspaces"`.
   - The backend will automatically write and load all user workspace `.sqlite` files inside this persistent directory, keeping them completely safe across service redeploys and scaling events.
