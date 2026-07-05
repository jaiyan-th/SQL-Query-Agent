# College Project Review Presentation Script

Use this high-impact, professional script to walk your reviewers through the **QueryGen AI** system during your college assessment.

---

## 1. The Introduction (First 60 seconds)
> "Good morning esteemed professors. Today, we are presenting **QueryGen AI**, a schema-aware, retrieval-augmented natural language to SQL agent.
>
> Many current LLM systems hallucinate SQL queries because they try to guess table columns, or they leak security by executing raw model outputs directly on a production database.
>
> We built QueryGen AI to solve both problems: it uses local vector search (RAG) to ground the generation context, and applies a strict multi-tiered backend guardrail matrix to protect the database against mutations and injection attacks."

---

## 2. Walkthrough Flow (The Demo)

### Step A: Connect & Introspect
> "First, we display our database connection dashboard. We are currently connected to our database schema (for this demonstration, we are querying our sample university placement dataset containing student records, companies, and application transactions).
>
> When we click 'Sync Schema', the server inspects the database constraints, creates structured table documents, and stores their vector embeddings. This keeps our search completely grounded."

### Step B: Function 1 Demo (SQL Generation Only)
> "Let's ask: *'Show top 5 companies by package'*. We select 'Gen SQL Only'.
>
> Notice that the system successfully matched the semantics of the query, retrieved the `companies` table using vector similarity, and outputted the exact clean SELECT SQL without executing it on the DB. This represents safe code-generation."

### Step C: Function 2 Demo (SQL Generation & Run)
> "Now let's run the query. The system validates the generated SQL against our backend lexical guardrails, runs it against the database, and renders a clean interactive table showing Google, Amazon, and Zoho, along with exact timing logs."

### Step D: Self-Correction Loop
> "If we ask a highly complex or ambiguous query that fails executing, our system triggers a self-correction loop. It catches the database error, sends it back to Gemini, and regenerates a valid query on the fly, with up to 2 attempts, completely transparently to the user."

### Step E: Security Guardrails Block
> "Finally, let's verify security. What if a user inputs a destructive statement like: *'Drop the companies table'* or tries to inject query chains with semicolons?
>
> Watch what happens. The SQL Guardrails immediately trigger on the backend, block the execution, flag the forbidden keyword, and shield our database from any mutation!"
