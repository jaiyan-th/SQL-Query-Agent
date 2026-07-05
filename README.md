# QueryGen AI — RAG-Powered Natural Language to SQL Query Agent 🚀

QueryGen AI is a production-ready SQL Query Agent that converts natural language questions into SQL queries using RAG, Qdrant, PostgreSQL schema grounding, and LLMs. It provides two core functions: SQL generation and safe SQL execution with chatbot-style result formats.

---

## ⭐ Two-Function Design

### Function 1 — Query Generation Mode  
**Endpoint**: `POST /api/generate-query`
```
Natural language 
  → RAG schema retrieval (retrieves database schema context from Qdrant)
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
  → Guardrail validation (verifies SELECT-only execution boundaries)
  → Limit injection (limits records)
  → Safe SELECT execution on connected PostgreSQL database
  → Chatbot output formatting (table, bar chart, pie chart, text answer, report, analysis)
```
*Returns: SQL, results, table output, charts, text answer, report, analysis, RAG context, and guardrail status.*

---

## 🛠️ Production Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Python 3.11+, FastAPI |
| **Validation** | Pydantic v2 |
| **Database Access** | SQLAlchemy 2.0 |
| **Production Database** | Neon PostgreSQL |
| **Vector Database** | Qdrant Cloud |
| **LLM** | Groq (primary), Gemini (fallback) |
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Vanilla CSS + Tailwind CSS |
| **Deployment** | Render |

---

## ⚙️ Backend Setup & Configuration

### 1. Environment Variables
Create a `.env` file in the `backend/` directory:
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

1. Connect to Neon PostgreSQL using connection strings.
2. Introspect database schemas via SQLAlchemy (tables, columns, keys, and foreign relationships), excluding internal tables (`querygen_users`, `querygen_history`).
3. Convert schema metadata into text documents and generate embeddings using `fastembed` (`BAAI/bge-small-en-v1.5`).
4. Store embeddings and payloads in Qdrant Cloud.
5. Query Qdrant vector search to fetch schema context for every user question, and inject into LLM prompts.

---

## 🛡️ Security Wording & Guardrails

* **Read-only SQL execution**: Enforces SELECT query configurations on active PostgreSQL database clients.
* **SELECT-only guardrails**: Strips comments and blocks destructive SQL statements (DDL/DML mutations) at the code level.
* **No destructive SQL**: Immediate execution rejections of statements containing `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, or semicolon injections.
* **Internal Schema Restrictions**: Strictly blocks and rejects queries attempting to select or reference `querygen_users`, `querygen_history`, or `users`.
* **JWT protected workspace**: User routing and history logs are secured via standard JWT Bearer token authentication.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Backend health check (PostgreSQL + Qdrant status) |
| `POST` | `/api/connection/test` | Test PostgreSQL connection |
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Log in and receive a JWT token |
| `GET` | `/api/auth/me` | Retrieve profile of the logged-in user |
| `POST` | `/api/rag/ingest-schema` | Introspect schema → store in Qdrant Cloud |
| `POST` | `/api/generate-query` | Function 1: Generate SQL (no execution) |
| `POST` | `/api/generate-and-run` | Function 2: Generate + execute SQL |
| `GET` | `/api/history` | Query history logs |
| `GET` | `/api/suggestions` | Fetch context-specific suggestions |
