# Security & Execution Guardrails

This document specifies the defense-in-depth security layers implemented in **QueryGen AI** to ensure the execution of zero malicious SQL queries.

## Risk Assessment
Letting natural language inputs directly execute on a production database carries SQL injection risks, accidental mutation risks (deletions/drops), and Denial of Service (DoS) risks (running unbounded slow queries).

## Security Matrix

| Layer | Objective | Implementation |
| :--- | :--- | :--- |
| **Layer 1: Prompt Restricting** | Restrict output generation to safe SELECT queries | LLM System instruction restricts verbs and denies DDL/DML statements. |
| **Layer 2: SQL Lexical Normalizer** | Strip formatting hacks and comments | Regex-based comment stripping (`--` and `/* ... */`) and multiple whitespace collapsing. |
| **Layer 3: Multi-Statement Filter** | Prevent command injection chaining | Checks for multiple semicolons and denies query execution if multi-statements exist. |
| **Layer 4: Command Whitelisting** | Verify starting execution verbs | Ensures queries only start with a standard `SELECT` or `WITH ... SELECT`. |
| **Layer 5: Keyword Blacklist** | Block structural alterations and write operations | Word-boundary checking of blacklisted keywords like `DELETE`, `DROP`, `ALTER`, etc. |
| **Layer 6: Automatic LIMIT Enforcing** | Prevent out of memory DoS | Injects a safe `LIMIT 50` default and enforces a hard cap of `MAX_ROWS=100`. |
| **Layer 7: Connection Restrictions** | Force database read-only execution roles | Prompts users to configure read-only database connections when deploying postgres. |

## Blacklisted Command List
The following verbs are strictly denied in any executing SQL query, regardless of context:
`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `REPLACE`, `MERGE`, `GRANT`, `REVOKE`, `PRAGMA`, `ATTACH`, `DETACH`, `COPY`, `CALL`, `EXEC`, `EXECUTE`, `SHUTDOWN`
