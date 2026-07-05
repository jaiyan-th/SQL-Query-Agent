# QueryGen AI — System Architecture

This document describes the full-stack system architecture of **QueryGen AI**, a schema-aware, RAG-powered natural language to SQLite SQL generation agent.

## System Workflow Diagram

The diagram below details the end-to-end flow from database file upload and schema indexing to safe natural language query execution:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as React SPA (Vite)
    participant Backend as FastAPI API Server
    participant VectorStore as Qdrant Cloud
    participant LLM as Groq / Gemini Fallback
    participant PlatformDB as Neon PostgreSQL
    participant SQLiteDB as Local SQLite File

    %% Setup & Ingestion
    User->>Frontend: Selects & uploads SQLite file (.db)
    Frontend->>Backend: POST /api/sqlite/upload
    Backend->>Backend: Save file securely to storage/sqlite_workspaces/
    Backend->>PlatformDB: Insert SqliteWorkspace metadata record
    Backend-->>Frontend: Returns workspace_id & success

    User->>Frontend: Clicks "Sync Schema to Qdrant"
    Frontend->>Backend: POST /api/rag/ingest-schema
    Backend->>SQLiteDB: Introspect tables, columns, keys via SQLAlchemy
    Backend->>Backend: Generate schema docs & embed via fastembed (bge-small-en-v1.5)
    Backend->>VectorStore: Upsert vectors with tenant payload (user_id, workspace_id)
    Backend->>PlatformDB: Mark workspace schema_indexed = True
    Backend-->>Frontend: Returns success (number of tables indexed)

    %% Query Pipeline
    User->>Frontend: Enters natural language question
    Frontend->>Backend: POST /api/generate-and-run { question }
    Backend->>VectorStore: Search table vectors (filtered by user_id & workspace_id)
    VectorStore-->>Backend: Returns relevant table definitions
    Backend->>LLM: Generate SQL (Grounding Prompts + RAG Context)
    LLM-->>Backend: Returns SQL + Explanation JSON
    Backend->>Backend: SQL Guardrail Verification (SELECT-only, block DDL/DML & PRAGMA)
    alt Safe SELECT Query
        Backend->>SQLiteDB: Connect via read-only engine & Execute SQL
        SQLiteDB-->>Backend: Returns tabular results
        Backend->>PlatformDB: Log successful query execution in history
    else Unsafe Mutation / PRAGMA Blocked
        Backend->>PlatformDB: Log blocked query in history
        Backend-->>Frontend: Returns "Blocked by SQL Guardrails" (Safety error)
    end
    Backend-->>Frontend: Returns formatted data, columns, and explanations
    Frontend->>User: Renders beautiful interactive table, chart config, and explanations
```

## Modular Architectural Components

### 1. SQLite Workspace Storage & Introspection (`backend/app/api/sqlite.py` & `backend/app/db/schema_introspect.py`)
- Manages uploaded SQLite database files, storing them securely on disk under paths isolated by user ID and workspace ID.
- Accesses SQLite files in read-only mode (`mode=ro`).
- Uses SQLAlchemy inspector to fetch table names, column details, data types, nullability, primary keys, and foreign-key constraints.

### 2. Qdrant Cloud Semantic RAG Retriever (`backend/app/rag/`)
- Serializes database schema tables into structured markdown documents.
- Uses `fastembed` (`BAAI/bge-small-en-v1.5`) to generate high-dimensional indices.
- Performs cosine-similarity matching of user questions against table embeddings in Qdrant Cloud.
- Enforces multi-tenant isolation by filtering Qdrant queries on `user_id` and `workspace_id` payloads.

### 3. Prompt Engineering & LLM Client (`backend/app/llm/`)
- Integrates with Groq (primary) and Gemini (fallback) API endpoints.
- Structures system instructions to guide models to output standard SQLite statements.
- Configures deterministic structured JSON outputs (`LLMResponse`) matching expected Pydantic schemas.

### 4. Strict Backend SQL Guardrails (`backend/app/sql/`)
- Runs a multi-tier regex and lexical analyzer to validate queries.
- Blocks write mutations (DML/DDL), semicolon injections, comment hacks, and SQLite-specific administrative commands (`PRAGMA`, `ATTACH`, `DETACH`, `VACUUM`, etc.).
- Restricts queries referencing internal platform tables (`querygen_users`, `querygen_history`, etc.).
- Enforces query limitations (`LIMIT 50`) and hard caps result lists to prevent Denial of Service.

### 5. Platform Metadata Database (`backend/app/db/connection.py` & `models.py`)
- Neon PostgreSQL database used for platform services.
- Stores user credentials, session settings, SQLite workspace records (file metadata, indexing timestamps), and user query execution logs.
