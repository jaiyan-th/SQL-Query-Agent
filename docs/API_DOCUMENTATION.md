# API Endpoint Documentation

All REST API endpoints are exposed on port `8000` of the server (default FastAPI port). JWT token authentication is required for all endpoints except health check, login, and signup. Send the JWT token in the `Authorization: Bearer <token>` header.

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

### 2. User Authentication

#### Signup / Register
- **Method**: `POST`
- **Path**: `/api/auth/signup`
- **Request Body**:
  ```json
  {
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword",
    "role": "analyst"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "User registered successfully."
  }
  ```

#### Login
- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Request Body**:
  ```json
  {
    "username": "john@example.com",
    "password": "securepassword"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer"
  }
  ```

#### Current User Info
- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "role": "analyst"
  }
  ```

---

### 3. SQLite Workspace Management

#### Upload SQLite File
- **Method**: `POST`
- **Path**: `/api/sqlite/upload`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: `file` (Multipart form file upload, extension must be `.db`, `.sqlite`, or `.sqlite3`)
- **Response**:
  ```json
  {
    "success": true,
    "message": "SQLite database uploaded successfully.",
    "workspace_id": "8fa538e1-d249-43c3-b43e-c6e8be139e80",
    "database_type": "sqlite",
    "original_filename": "placement_data.db",
    "table_count": 6
  }
  ```

#### Get Active Workspace Metadata
- **Method**: `GET`
- **Path**: `/api/sqlite/active`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "has_active_sqlite": true,
    "workspace_id": "8fa538e1-d249-43c3-b43e-c6e8be139e80",
    "database_type": "sqlite",
    "original_filename": "placement_data.db",
    "table_count": 6,
    "uploaded_at": "2026-07-06T01:10:00Z",
    "schema_indexed": true,
    "schema_indexed_at": "2026-07-06T01:12:00Z"
  }
  ```

#### Delete Active Workspace
- **Method**: `DELETE`
- **Path**: `/api/sqlite/active`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "message": "SQLite workspace removed successfully."
  }
  ```

---

### 4. RAG Ingestion & Status

#### Ingest Schema
Introspects tables in the uploaded SQLite file and indexes them into Qdrant Cloud.

- **Method**: `POST`
- **Path**: `/api/rag/ingest-schema`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "indexed_tables": 6,
    "indexed_documents": 6,
    "workspace_id": "8fa538e1-d249-43c3-b43e-c6e8be139e80",
    "database_type": "sqlite"
  }
  ```

#### Get RAG Status
- **Method**: `GET`
- **Path**: `/api/rag/status`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "schema_indexed": true,
    "workspace_id": "8fa538e1-d249-43c3-b43e-c6e8be139e80",
    "indexed_table_count": 6,
    "indexed_at": "2026-07-06T01:12:00Z"
  }
  ```

---

### 5. Function 1: Generate SQL Only
Generates grounded safe SQL for a natural language question. Does not execute the query.

- **Method**: `POST`
- **Path**: `/api/generate-query`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "question": "Show all students from CSE department"
  }
  ```
- **Response**:
  ```json
  {
    "mode": "generate_query",
    "question": "Show all students from CSE department",
    "generated_sql": "SELECT * FROM students WHERE department = 'CSE' LIMIT 50;",
    "explanation": "This query retrieves all columns from the students table filtered by the CSE department, limited to the top 50 records.",
    "tables_used": ["students"],
    "confidence": 95,
    "rag_context_used": true,
    "guardrail_status": "passed",
    "safety_status": "safe",
    "executed": false,
    "schema_context": [
      {
        "table_name": "students",
        "content": "Table: students\nColumns:\n  - id: INTEGER, not nullable (Primary Key)\n  - name: VARCHAR, not nullable\n  - department: VARCHAR, nullable\n  - gpa: FLOAT, nullable",
        "relevance_score": 0.88
      }
    ]
  }
  ```

---

### 6. Function 2: Generate and Run
Generates, validates, and runs safe SQLite SELECT queries on the uploaded database workspace.

- **Method**: `POST`
- **Path**: `/api/generate-and-run`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "question": "Show all students from CSE department"
  }
  ```
- **Response**:
  ```json
  {
    "mode": "generate_and_execute",
    "question": "Show all students from CSE department",
    "generated_sql": "SELECT * FROM students WHERE department = 'CSE' LIMIT 50;",
    "explanation": "This query retrieves all columns from the students table filtered by the CSE department, limited to the top 50 records.",
    "columns": ["id", "name", "department", "gpa"],
    "rows": [
      { "id": 1, "name": "Alice Smith", "department": "CSE", "gpa": 3.9 },
      { "id": 2, "name": "Bob Jones", "department": "CSE", "gpa": 3.7 }
    ],
    "row_count": 2,
    "execution_time_ms": 12.5,
    "rag_context_used": true,
    "guardrail_status": "passed",
    "safety_status": "safe",
    "executed": true,
    "schema_context": [
      {
        "table_name": "students",
        "content": "Table: students\nColumns:\n  - id: INTEGER, not nullable (Primary Key)\n  - name: VARCHAR, not nullable\n  - department: VARCHAR, nullable\n  - gpa: FLOAT, nullable",
        "relevance_score": 0.88
      }
    ]
  }
  ```

---

### 7. Query Execution History
Returns list of past query items and execution logs.

- **Method**: `GET`
- **Path**: `/api/history`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  [
    {
      "id": 15,
      "user_id": 1,
      "workspace_id": "8fa538e1-d249-43c3-b43e-c6e8be139e80",
      "question": "Show all students from CSE department",
      "generated_sql": "SELECT * FROM students WHERE department = 'CSE' LIMIT 50;",
      "mode": "execute",
      "output_format": "table",
      "status": "success",
      "row_count": 2,
      "execution_time_ms": 12,
      "error_message": null,
      "created_at": "2026-07-06T01:13:00Z"
    }
  ]
  ```

---

### 8. Suggestions
Fetches suggestions based on the active SQLite schema.

- **Method**: `GET`
- **Path**: `/api/suggestions`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "suggestions": [
      { "question": "Show all columns from the students table." },
      { "question": "Find the average gpa in students." }
    ]
  }
  ```
