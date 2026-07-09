/**
 * QueryGen AI — API service layer
 * SQLite upload mode: users upload .db/.sqlite/.sqlite3 files.
 */

import { API_BASE_URL } from '../api/config';

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) base['Authorization'] = `Bearer ${token}`;
  return base;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Response Types ────────────────────────────────────────────────────────

export interface UploadSqliteResponse {
  success: boolean;
  message: string;
  workspace_id?: string;
  database_type: string;
  original_filename?: string;
  table_count?: number;
}

export interface ActiveSqliteWorkspaceResponse {
  has_active_sqlite: boolean;
  workspace_id?: string;
  database_type: string;
  original_filename?: string;
  table_count?: number;
  uploaded_at?: string;
  schema_indexed: boolean;
  schema_indexed_at?: string;
}

export interface DeleteSqliteWorkspaceResponse {
  success: boolean;
  message: string;
}

export interface IngestSchemaResponse {
  success: boolean;
  indexed_tables: number;
  indexed_documents: number;
  workspace_id: string;
  database_type: string;
}

export interface RAGStatusResponse {
  schema_indexed: boolean;
  workspace_id: string;
  indexed_table_count: number;
  indexed_at: string;
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
  sql?: string;
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
  sql?: string;
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
}

// ─── SQLite Workspace ─────────────────────────────────────────────────────────

/** Upload a SQLite file. Uses multipart/form-data. */
export async function uploadSqliteFile(file: File): Promise<UploadSqliteResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/sqlite/upload`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: HTTP ${res.status}`);
  }
  return res.json();
}

/** Get active SQLite workspace metadata. */
export async function getActiveSqliteWorkspace(): Promise<ActiveSqliteWorkspaceResponse> {
  return apiFetch<ActiveSqliteWorkspaceResponse>('/api/sqlite/active');
}

/** Delete (replace) the active SQLite workspace. */
export async function deleteActiveSqliteWorkspace(): Promise<DeleteSqliteWorkspaceResponse> {
  return apiFetch<DeleteSqliteWorkspaceResponse>('/api/sqlite/active', { method: 'DELETE' });
}

// ─── RAG ──────────────────────────────────────────────────────────────────────

/** Extract schema from active SQLite workspace and index into Qdrant. */
export async function ingestSchema(): Promise<IngestSchemaResponse> {
  return apiFetch<IngestSchemaResponse>('/api/rag/ingest-schema', { method: 'POST' });
}

/** Get RAG indexing status for the active workspace. */
export async function getRagStatus(): Promise<RAGStatusResponse> {
  return apiFetch<RAGStatusResponse>('/api/rag/status');
}

// ─── Query ────────────────────────────────────────────────────────────────────

/** Function 1: Generate SQL only, no execution. */
export async function generateQuery(question: string): Promise<GenerateQueryResponse> {
  const data = await apiFetch<GenerateQueryResponse>('/api/generate-query', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
  if (data.generated_sql && !data.sql) data.sql = data.generated_sql;
  return data;
}

/** Function 2: Generate SQL and execute on the uploaded SQLite file. */
export async function generateAndRun(question: string): Promise<GenerateAndRunResponse> {
  const data = await apiFetch<GenerateAndRunResponse>('/api/generate-and-run', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
  if (data.generated_sql && !data.sql) data.sql = data.generated_sql;
  return data;
}

// ─── Schema Browser & History ───────────────────────────────────────────────

export interface SchemaTableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface SchemaForeignKey {
  columns: string[];
  referred_table: string;
  referred_columns: string[];
}

export interface SchemaTable {
  table_name: string;
  columns: SchemaTableColumn[];
  primary_keys: string[];
  foreign_keys: SchemaForeignKey[];
  row_count: number;
}

export interface SchemaResponse {
  tables: SchemaTable[];
  database_type?: string;
  workspace_id?: string;
}

export interface QueryHistoryItem {
  id: number;
  question: string;
  generated_sql: string;
  mode: string;
  status: string;
  created_at: string;
  row_count?: number | null;
  execution_time_ms?: number | null;
  error_message?: string | null;
  database_type?: string;
  connection_name?: string;
}

export interface QueryHistoryResponse {
  history: QueryHistoryItem[];
  total: number;
}

/** Get tables and columns schema for the SQLite workspace. */
export async function getSqliteSchema(): Promise<SchemaResponse> {
  return apiFetch<SchemaResponse>('/api/sqlite/schema');
}

/** Get previous query execution history for the logged-in user. */
export async function getQueryHistory(): Promise<QueryHistoryResponse> {
  return apiFetch<QueryHistoryResponse>('/api/history');
}

export interface LLMStatusResponse {
  groq_configured: boolean;
  gemini_configured: boolean;
  primary_provider: string;
  fallback_provider: string;
}

/** Get configured status of LLM providers. */
export async function getLlmStatus(): Promise<LLMStatusResponse> {
  return apiFetch<LLMStatusResponse>('/api/settings/llm-status');
}

