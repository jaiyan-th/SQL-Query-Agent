/**
 * QueryGen AI — Typed API service layer
 * All backend calls go through this file with consistent auth headers and error handling.
 *
 * Usage:
 *   import { testConnection, saveConnection, ingestSchema, generateQuery, generateAndRun } from '../services/api';
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/** Get authorization headers including Bearer token from localStorage */
function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) base['Authorization'] = `Bearer ${token}`;
  return base;
}

/** Generic fetch wrapper with error extraction */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers as Record<string, string> || {}),
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ─── Response Types ────────────────────────────────────────────────────────

export interface ConnectionTestResponse {
  connected: boolean;
  success?: boolean;
  database_type?: string;
  provider?: string;
  masked_url?: string;
  host?: string;
  database_name?: string;
  read_only_mode?: boolean;
  message?: string;
}

export interface ConnectionSaveResponse {
  saved: boolean;
  success?: boolean;
  connection_id: number;
  database_type: string;
  masked_url: string;
  host: string;
  database_name: string;
  message?: string;
}

export interface ActiveConnectionResponse {
  connection_id: number;
  connected: boolean;
  database_type: string;
  provider: string;
  masked_url: string;
  host: string;
  database_name: string;
}

export interface IngestSchemaResponse {
  success: boolean;
  indexed_tables: number;
  indexed_documents: number;
  connection_id: number;
  database_type: string;
  message?: string;
  tables_indexed?: number;   // alias
}

export interface RAGStatusResponse {
  indexed: boolean;
  connection_id: number;
  indexed_tables: number;
  indexed_documents: number;
}

export interface SchemaContext {
  table_name: string;
  content: string;
  relevance_score: number;
}

export interface GenerateQueryResponse {
  mode: string;
  question: string;
  generated_sql: string;
  sql?: string;              // alias populated from generated_sql
  explanation: string;
  tables_used: string[];
  confidence: number;
  rag_context_used: boolean;
  guardrail_status: string;
  safety_status: string;
  executed: boolean;
  schema_context: SchemaContext[];
}

export interface GenerateAndRunResponse {
  mode: string;
  question: string;
  generated_sql: string;
  sql?: string;              // alias populated from generated_sql
  explanation: string;
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms?: number | null;
  rag_context_used: boolean;
  guardrail_status: string;
  safety_status: string;
  executed: boolean;
  schema_context: SchemaContext[];
  message?: string;
}

// ─── Service Functions ─────────────────────────────────────────────────────

/**
 * Step 1: Test a PostgreSQL connection URL.
 * Sends connection_url; backend auto-detects database type.
 */
export async function testConnection(connectionUrl: string): Promise<ConnectionTestResponse> {
  return apiFetch<ConnectionTestResponse>('/api/connections/test', {
    method: 'POST',
    body: JSON.stringify({ connection_url: connectionUrl }),
  });
}

/**
 * Step 2: Save the connection as active for this user.
 * Encrypts the URL server-side; never returns the raw URL.
 */
export async function saveConnection(connectionUrl: string): Promise<ConnectionSaveResponse> {
  return apiFetch<ConnectionSaveResponse>('/api/connections/save', {
    method: 'POST',
    body: JSON.stringify({
      connection_url: connectionUrl,
      connection_name: 'My Database',
    }),
  });
}

/**
 * Fetch the currently active database connection metadata.
 * Returns masked URL only — never the raw credentials.
 */
export async function getActiveConnection(): Promise<ActiveConnectionResponse> {
  return apiFetch<ActiveConnectionResponse>('/api/connections/active');
}

/**
 * Step 3: Extract schema from the active database and index into Qdrant.
 * Must have a saved active connection first.
 */
export async function ingestSchema(): Promise<IngestSchemaResponse> {
  return apiFetch<IngestSchemaResponse>('/api/rag/ingest-schema', {
    method: 'POST',
  });
}

/**
 * Get Qdrant schema index status for the active connection.
 */
export async function getRAGStatus(): Promise<RAGStatusResponse> {
  return apiFetch<RAGStatusResponse>('/api/rag/status');
}

/**
 * Step 4a: Generate SQL from a natural language question (no execution).
 * Uses RAG pipeline: Qdrant → LLM → guardrails → SQL.
 */
export async function generateQuery(question: string): Promise<GenerateQueryResponse> {
  const data = await apiFetch<GenerateQueryResponse>('/api/generate-query', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
  // Normalize: ensure 'sql' alias is always populated
  if (data.generated_sql && !data.sql) data.sql = data.generated_sql;
  return data;
}

/**
 * Step 4b: Generate SQL and execute it on the connected database.
 * Validates SQL with guardrails, executes safe SELECT only.
 * Returns columns, rows as list of dicts, row_count, and execution_time_ms.
 */
export async function generateAndRun(question: string): Promise<GenerateAndRunResponse> {
  const data = await apiFetch<GenerateAndRunResponse>('/api/generate-and-run', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
  // Normalize: ensure 'sql' alias is always populated
  if (data.generated_sql && !data.sql) data.sql = data.generated_sql;
  return data;
}
