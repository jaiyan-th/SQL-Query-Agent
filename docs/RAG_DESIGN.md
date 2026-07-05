# RAG Pipeline Design Schema

This document outlines the design and mathematical layout of the Retrieval-Augmented Generation (RAG) vector store used in **QueryGen AI**.

## Core Problem
Feeding an entire database schema with dozens of tables and thousands of columns into an LLM prompt degrades context windows, increases execution latency, and causes generation noise.

## Solution: Schema-Aware RAG
We treat each database table as a standalone semantic document containing the table name, columns, primary/foreign key connections, and explicit business meaning notes.

```text
+-----------------------+      +---------------------------+      +--------------------------+
|  Database Connection  | ===> |  Introspect SQL Metadata  | ===> | Create Table Documents   |
+-----------------------+      +---------------------------+      +--------------------------+
                                                                                ||
                                                                                \/
+-----------------------+      +---------------------------+      +--------------------------+
| Inject into Prompt    | <=== | Cosine Similarity Search  | <=== | Store Vector Embeddings  |
+-----------------------+      +---------------------------+      +--------------------------+
```

## Vector Store Details

### 1. Embeddings Model
- **Model name**: `gemini-embedding-2-preview`
- **Output dimensions**: 768

### 2. Math Representation (Cosine Similarity)
The similarity between a user's natural language question vector $A$ and a database schema table document vector $B$ is calculated as:

$$\text{Similarity}(A, B) = \frac{A \cdot B}{\|A\| \|B\|} = \frac{\sum_{i=1}^{n} A_i B_i}{\sqrt{\sum_{i=1}^{n} A_i^2} \sqrt{\sum_{i=1}^{n} B_i^2}}$$

### 3. Metadata Index Structures
Each stored document includes the following schema properties:
- `id`: Unique deterministic key (e.g. `schema_table_<table_name>`)
- `title`: human-readable description
- `content`: raw column list, types, relationships, and business notes
- `metadata`: type details, name bindings

### 4. Few-Shot query indexing
Upon every successful query execution, the original natural language query and the safe executing SQL are stored as a `history_example` document. These history examples are searched alongside schema tables during subsequent queries to provide few-shot inline context examples to the LLM.
