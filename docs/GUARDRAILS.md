# Security & Execution Guardrails

This document specifies the defense-in-depth security layers implemented in **QueryGen AI** to ensure the execution of zero malicious SQL queries on SQLite databases.

## Risk Assessment
Letting natural language inputs directly execute on database files carries SQL injection risks, accidental mutation risks (deletions/drops), and Denial of Service (DoS) risks (running unbounded slow queries).

## Security Matrix

| Layer | Objective | Implementation |
| :--- | :--- | :--- |
| **Layer 1: Prompt Restricting** | Restrict output generation to safe SELECT queries | LLM system instructions restrict generated SQL to standard `SELECT` or `WITH ... SELECT` queries. |
| **Layer 2: SQL Lexical Normalizer** | Strip formatting hacks and comments | Regex-based comment stripping (`--`, `#`, and `/* ... */`) and whitespace normalization. |
| **Layer 3: Multi-Statement Filter** | Prevent command injection chaining | Checks for multiple semicolons outside literal strings and denies query execution if multi-statements exist. |
| **Layer 4: Command Whitelisting** | Verify starting execution verbs | Ensures queries only start with a standard `SELECT` or `WITH`. |
| **Layer 5: Keyword Blacklist** | Block structural alterations and write operations | Word-boundary checking of blacklisted keywords including DML/DDL mutations and SQLite administrative verbs. |
| **Layer 6: Automatic LIMIT Enforcing** | Prevent out of memory DoS | Injects a safe `LIMIT 50` default and enforces a hard cap of `MAX_ROWS=100`. |
| **Layer 7: Engine Restrictions** | Restrict write access to workspace files | Files are accessed using standard file handles on disk, with lexical guardrails acting as the security barrier. |

## Blacklisted Command List
The following verbs are strictly denied in any executing SQL query, regardless of context:
`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `REPLACE`, `MERGE`, `GRANT`, `REVOKE`, `PRAGMA`, `ATTACH`, `DETACH`, `VACUUM`, `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`, `REINDEX`, `ANALYZE`, `EXEC`, `EXECUTE`, `CALL`

## Internal Table Scope Restrictions
To prevent users from querying the platform database schema or workspace metadata structures, any statement containing word boundaries for the following tables will be immediately rejected:
- Platform Users: `querygen_users`, `users`
- Workspace Management: `querygen_sqlite_workspaces`, `querygen_connections`, `connections`
- Log Tables: `querygen_history`
