# SQL Query Agent

Ask a question in English, inspect the answer and its source SQL, and explore the results as a table or chart. The starter database represents a retailer selling across Indian states. Revenue and spend are measured in whole rupees.

## Run locally

Use Python 3.10 or newer, Node.js 22.12 or newer, and two terminals. The commands below assume you start at the repository root. The first terminal runs the backend.

```powershell
cd sql-agent/backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
python seed_db.py
```

On macOS or Linux, use `python3 -m venv .venv`, `.venv/bin/python -m pip install -r requirements.txt`, `cp .env.example .env` and `.venv/bin/python seed_db.py`.

Sign in to the Groq console, open **API Keys**, create a key and copy it into `GROQ_API_KEY` in `sql-agent/backend/.env`. This server loads its own environment file. Keep credentials out of Vite settings. [Groq API keys](https://console.groq.com/keys)

| Backend setting | Default or example |
|---|---|
| GROQ_API_KEY | Your Groq project key |
| GROQ_MODEL | llama-3.3-70b-versatile |
| DB_URL | sqlite:///retail.sqlite |
| FRONTEND_ORIGIN | http://localhost:5173 |

```powershell
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On macOS or Linux use `.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. In the second terminal:

```sh
cd sql-agent/frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. Vite forwards `/api` requests to FastAPI. For a frontend production build run `npm run build`; serve `dist/` and route `/api` to the backend. Restart the backend after changing environment settings. The seed script preserves an existing database. A new seed creates 18 customers, 8 products and 360 orders from January of the previous year through today.

## Docker startup

With Docker installed and `sql-agent/backend/.env` configured, run `docker compose up --build` from the repository root and open **http://localhost:8000**. The image serves the compiled React app and API together and seeds its own sample database during the build. To use an existing SQLite file in the container, mount it read-only and set DB_URL to its container path.

## Architecture

```text
 Your Python app  ──(question + schema + tools)──►  Groq (LLM API)
        │                                              │
        │                       Groq replies: "run this SQL: SELECT ..."
        │                                              │
        ◄──────────────────────────────────────────────┘
        │
        ▼
 Your app runs the SQL on the database (read-only connection)
        │
        ▼
 Database returns rows
        │
        ▼
 Python app sends rows or a query error to Groq as a tool result
        │
        ▼
 Groq requests another tool or writes the final answer
```

`app/agent.py` sends the question, conversation context, schema, SQL dialect, date and three function definitions on each completion. Python dispatches tool calls and matches each reply to its tool-call ID. The loop allows eight completion rounds per turn. The UI receives the final answer, the last successful result and the successfully executed statements. History retains eight exchanges per session in one server process and is cleared by **New chat**. Use one Uvicorn worker for in-memory history.

`app/tools.py` lists real tables, reflects an allowlisted table with three sample rows, and runs validated SQL. `app/safety.py` checks the parsed statement tree, restricts functions to analytics operations and rejects write statements. `app/db.py` owns all connections. SQLite opens with `mode=ro`, enables query-only mode and installs a five-second execution deadline. PostgreSQL and MySQL use read-only transactions and server statement limits. Results sent to Groq and the browser are capped at 100 rows. Table descriptions, sample values and result rows are transmitted to Groq. Connect only datasets appropriate for that disclosure.

## Six example questions

1. How many customers do we have?
2. Top 5 customers by total spend.
3. Only show customers from Tamil Nadu. (Ask immediately after question 2.)
4. Revenue by month this year.
5. Which product category sold the most units?
6. What was the average order value in rupees for each state?

For monthly revenue, the agent is asked to return a year-month label and numeric revenue. The UI charts two-column categorical or date series and provides a table toggle. **Show SQL** reveals the statements behind the answer.

## Switching databases

Set `DB_URL` in the backend environment and restart FastAPI. The SQLite seed script is only for the demo file. The app inspects and queries the selected database live.

| Database | DB_URL example | Account requirements |
|---|---|---|
| SQLite | `sqlite:///retail.sqlite` | A readable existing file. Relative paths resolve from the backend directory. |
| PostgreSQL | `postgresql+psycopg2://report_reader:PASSWORD@HOST:5432/analytics` | A dedicated login with CONNECT, schema USAGE and SELECT on approved tables in the current search path. |
| MySQL 8 | `mysql+pymysql://report_reader:PASSWORD@HOST:3306/analytics` | A dedicated login with SELECT on approved tables in the selected database. |

Use a least-privileged reader account with no administrative, file, write or privileged routine grants. URL-encode special characters in credentials. Use provider-required TLS settings for remote databases. The release serves one analyst workspace. Set APP_ENV=production, WORKSPACE_USER, and a unique WORKSPACE_PASSWORD of at least 16 characters in the server environment. Use an HTTPS reverse proxy for external access. The browser prompts for workspace credentials. Signed-in users share the database reader’s privileges. Keep Uvicorn on one worker so conversations stay in one process. Four concurrent chats are allowed. Render uses the root Dockerfile and the same-origin UI and API. Configure the secrets in the Render dashboard before deploying.

## API and checks

| Endpoint | Input and output |
|---|---|
| POST /api/chat | Send `{"session_id":"demo","message":"How many customers do we have?"}`. Returns `answer`, `columns`, `rows` as positional arrays, and `sql_used` as a list. |
| GET /api/schema | Returns a `tables` list with column names and types. |
| POST /api/reset | Send `{"session_id":"demo"}` to clear history. |
| GET /api/health | Returns server liveness. |

From the backend directory run `.\.venv\Scripts\python -m unittest -v test_agent` (or `.venv/bin/python -m unittest -v test_agent`). The suite scripts Groq replies while exercising the API and a temporary read-only SQLite database. It checks row counts, top customers, monthly totals, session follow-ups, tool errors and correction, forbidden operations, row limits and provider errors.

For a live acceptance check, run questions 1–4 above. The seeded count is **18** and there are **4** customers in Tamil Nadu. Ask **Delete all orders**, then count orders again; the count should remain **360**. To check authentication feedback, temporarily set an invalid backend Groq key and restart. A question should produce an actionable error toast. Restore the valid key and restart before continuing.

Run `npm test` in `sql-agent/frontend` for chart selection checks. The production bundle is generated by `npm run build`. A load balancer can probe `/api/health` for liveness and `/api/ready` for database connectivity and provider-key configuration. Readiness does not call Groq.

## Release checks

From the frontend directory, run `npm ci`, `npm test`, `npm run build`, then `node --test test/browser.test.js`. The browser check uses installed Google Chrome to exercise the compiled app with deterministic API responses. The GitHub Actions workflow also builds the combined Docker image and checks its homepage, schema and health endpoints.

The repository root contains the Docker and Render entry points. The application source is under `sql-agent/`. When upgrading an older QueryGen checkout, supply a fresh Groq key in the backend environment. Historical revisions of the earlier project tracked environment files. Rotate any active credentials that those files contained before sharing or deploying the repository.
