# College Project Review Presentation Script

Use this high-impact, professional script to walk your reviewers through the **QueryGen AI** system during your college assessment.

---

## 1. The Introduction (First 60 seconds)
> "Good morning esteemed professors. Today, we are presenting **QueryGen AI**, a schema-aware, retrieval-augmented natural language to SQL generation agent.
>
> Many current LLM systems hallucinate SQL queries because they try to guess table columns, or they leak security by executing raw model outputs directly on a production database.
>
> We built QueryGen AI to solve both problems: it uses local vector search (RAG) to ground the generation context, and applies a strict multi-tiered backend guardrail matrix to protect the database against mutations, administrative commands, and injection attacks."

---

## 2. Walkthrough Flow (The Demo)

### Step A: Upload & Introspect
> "First, we display our database workspace setup. Instead of exposing raw database production credentials, users simply upload their SQLite database file (`.db` or `.sqlite`). For this demonstration, we have uploaded our sample university placement dataset containing student records, companies, and placement transactions.
>
> When we click 'Sync Schema to Qdrant', the server inspects the table structures, columns, and foreign key relations, filters out internal platform schemas, creates structured table documents, and stores their vector embeddings in Qdrant Cloud. This keeps our vector search completely grounded."

### Step B: Function 1 Demo (SQL Generation Only)
> "Let's ask: *'Show top 5 companies by package'*. We select 'Generate SQL Only' mode.
>
> Notice that the system successfully matched the semantics of the query, retrieved the `companies` table using vector similarity, and outputted the exact clean SELECT SQL without executing it. This represents safe, isolated code-generation."

### Step C: Function 2 Demo (SQL Generation & Run)
> "Now let's run the query. We switch to 'Generate & Run' mode.
>
> The system validates the generated SQL against our backend lexical guardrails, runs it on our uploaded SQLite file using a local read-only engine, and renders a clean interactive table showing Google, Amazon, and Zoho, along with exact execution timing logs."

### Step D: Self-Correction Loop
> "If we ask a highly complex or ambiguous query that fails executing, our system triggers a self-correction loop. It catches the SQLite database error, sends it back to the LLM, and regenerates a valid query on the fly, with up to 2 attempts, completely transparently to the user."

### Step E: Security Guardrails Block
> "Finally, let's verify security. What if a user inputs a destructive statement like: *'Drop the companies table'* or tries to inject query chains with semicolons, or run SQLite administrative commands like *'PRAGMA table_info'*?
>
> Watch what happens. The SQL Guardrails immediately trigger on the backend, block the execution, flag the forbidden keyword, and shield our SQLite database from any mutation or metadata leak!"
