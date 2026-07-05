# API Endpoint Documentation

All REST API endpoints are exposed on port `3000` of the server.

---

### 1. Health Status
Returns general health and configuration state of the full-stack server.

- **Method**: `GET`
- **Path**: `/api/health`
- **Response**:
  ```json
  {
    "status": "ok",
    "app": "QueryGen AI",
    "environment": "development"
  }
  ```

---

### 2. Test Connection
Changes the active database connection string and triggers auto-introspection.

- **Method**: `POST`
- **Path**: `/api/connection/test`
- **Request Body**:
  ```json
  {
    "database_url": "postgresql://readonly_user:password@localhost:5432/my_db"
  }
  ```
- **Response**:
  ```json
  {
    "connected": true,
    "database_type": "postgresql",
    "message": "Database connection successful"
  }
  ```

---

### 3. Ingest Schema
Introspects current schemas and indexes tables into the semantic vector store.

- **Method**: `POST`
- **Path**: `/api/ingest-schema`
- **Response**:
  ```json
  {
    "status": "success",
    "tables_indexed": 4,
    "documents_created": 4,
    "collection": "schema_knowledge"
  }
  ```

---

### 4. Function 1: Generate SQL Only
Generates grounded safe SQL for a natural language question. Does not execute the query.

- **Method**: `POST`
- **Path**: `/api/generate-query`
- **Request Body**:
  ```json
  {
    "question": "Show top 5 companies by package"
  }
  ```
- **Response**:
  ```json
  {
    "sql": "SELECT company_name, package_lpa FROM companies ORDER BY package_lpa DESC LIMIT 5;",
    "explanation": "This query orders the companies table by package_lpa descending and returns the top 5.",
    "tables_used": ["companies"],
    "confidence": 95,
    "assumptions": [],
    "is_safe": true,
    "rag_context_used": [
      {
        "title": "companies table",
        "content": "TABLE: companies\nCOLUMNS:\n- company_id INTEGER\n- company_name TEXT\n- package_lpa REAL",
        "score": 0.89
      }
    ]
  }
  ```

---

### 5. Function 2: Generate and Run
Generates, validates, and runs safe SQL queries on the active database.

- **Method**: `POST`
- **Path**: `/api/generate-and-run`
- **Request Body**:
  ```json
  {
    "question": "Show top 5 companies by package"
  }
  ```
- **Response**:
  ```json
  {
    "question": "Show top 5 companies by package",
    "sql": "SELECT company_name, package_lpa FROM companies ORDER BY package_lpa DESC LIMIT 5;",
    "explanation": "This query orders the companies table by package_lpa descending and returns the top 5.",
    "columns": ["company_name", "package_lpa"],
    "rows": [
      { "company_name": "Google", "package_lpa": 32.5 },
      { "company_name": "Amazon", "package_lpa": 28.0 }
    ],
    "row_count": 2,
    "execution_time_ms": 14,
    "status": "success"
  }
  ```

---

### 6. Query Execution History
Returns list of past query items and execution logs.

- **Method**: `GET`
- **Path**: `/api/history`
- **Response**:
  ```json
  [
    {
      "id": 1,
      "question": "Show top 5 companies by package",
      "sqlQuery": "SELECT company_name, package_lpa FROM companies ORDER BY package_lpa DESC LIMIT 5;",
      "mode": "generate_and_run",
      "status": "success",
      "tablesUsed": "companies",
      "confidence": 95
    }
  ]
  ```
