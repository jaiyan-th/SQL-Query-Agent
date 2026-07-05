# RAG Pipeline Design Schema

This document outlines the design and mathematical layout of the Retrieval-Augmented Generation (RAG) vector store used in **QueryGen AI**.

## Core Problem
Feeding an entire database schema with dozens of tables and thousands of columns into an LLM prompt degrades context windows, increases execution latency, and causes generation noise.

## Solution: Schema-Aware RAG
We treat each database table as a standalone semantic document containing the table name, columns, data types, nullability, primary key constraints, and foreign key references.

```text
+-----------------------+      +---------------------------+      +--------------------------+
| SQLite DB Workspace   | ===> |  Introspect SQL Metadata  | ===> | Create Table Documents   |
+-----------------------+      +---------------------------+      +--------------------------+
                                                                                ||
                                                                                \/
+-----------------------+      +---------------------------+      +--------------------------+
| Inject into Prompt    | <=== | Cosine Similarity Search  | <=== | Store Vector Embeddings  |
+-----------------------+      +---------------------------+      +--------------------------+
```

## Vector Store Details

### 1. Embeddings Model
- **Embedding Library**: `fastembed` (Python library for fast, light local embeddings)
- **Model Name**: `BAAI/bge-small-en-v1.5`
- **Output Dimensions**: 384

### 2. Math Representation (Cosine Similarity)
The similarity between a user's natural language question vector $A$ and a database schema table document vector $B$ is calculated as:

$$\text{Similarity}(A, B) = \frac{A \cdot B}{\|A\| \|B\|} = \frac{\sum_{i=1}^{n} A_i B_i}{\sqrt{\sum_{i=1}^{n} A_i^2} \sqrt{\sum_{i=1}^{n} B_i^2}}$$

Cosine similarity matches the user question's semantic intent against the schema documentation and table constructs stored in Qdrant.

### 3. Metadata Index Structures & Tenant Isolation
Each stored document point inside the Qdrant Cloud collection includes:
- `id`: Deterministic UUID v5 generated from the user's `workspace_id` and `table_name`.
- `vector`: 384-dimensional dense array.
- `payload`:
  - `user_id`: Platform user ID (Integer) for tenant isolation.
  - `workspace_id`: SQLite workspace ID (UUID string) for workspace isolation.
  - `database_type`: `"sqlite"`
  - `table_name`: Name of the table.
  - `chunk_type`: `"table_schema"`
  - `content`: Structure of the table (columns list, keys, relationships).
  - `columns`: Column data type metadata array.
  - `primary_keys`: Constrained columns array.
  - `foreign_keys`: List of foreign key connections.
  - `relationships`: Human-readable reference strings.

### 4. Tenant-Isolated Query Filters
To ensure users can only retrieve schema metadata from their own uploaded SQLite databases, all Qdrant lookups include strict filtering logic:
```json
{
  "must": [
    { "key": "user_id", "match": { "value": 123 } },
    { "key": "workspace_id", "match": { "value": "8fa538e1-d249-43c3-b43e" } }
  ]
}
```
Payload indexes on `user_id` and `workspace_id` are automatically created on startup via `ensure_collection()` to optimize retrieval speeds.
