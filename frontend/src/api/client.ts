/**
 * API client for QueryGen AI backend
 */

import { API_BASE_URL } from './config';


export interface HealthResponse {
  status: string;
  app: string;
  environment: string;
}

export interface ConnectionTestRequest {
  database_url?: string;
}

export interface ConnectionTestResponse {
  connected: boolean;
  success?: boolean;
  database_type?: string;
  message: string;
  masked_url?: string;
  host?: string;
  database_name?: string;
}

export interface SchemaIngestResponse {
  status: string;
  tables_indexed: number;
  documents_created: number;
  collection: string;
}

export interface SchemaContext {
  table_name: string;
  content: string;
  relevance_score: number;
}

export interface GenerateQueryRequest {
  question: string;
}

export interface GenerateQueryResponse {
  mode: string;
  question: string;
  generated_sql: string;
  sql: string;
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
  sql: string;
  explanation: string;
  columns: string[];
  rows: any[];
  row_count: number;
  execution_time_ms?: number | null;
  rag_context_used: boolean;
  guardrail_status: string;
  safety_status: string;
  executed: boolean;
  schema_context: SchemaContext[];
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

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data && typeof data === 'object') {
      if ('generated_sql' in data && !('sql' in data)) {
        (data as any).sql = (data as any).generated_sql;
      }
    }
    return data as T;
  }

  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  async testConnection(data: ConnectionTestRequest = {}): Promise<ConnectionTestResponse> {
    return this.request<ConnectionTestResponse>('/api/connection/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async ingestSchema(): Promise<SchemaIngestResponse> {
    return this.request<SchemaIngestResponse>('/api/rag/ingest-schema', {
      method: 'POST',
    });
  }

  async generateQuery(data: GenerateQueryRequest): Promise<GenerateQueryResponse> {
    return this.request<GenerateQueryResponse>('/api/generate-query', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateAndRun(data: GenerateQueryRequest): Promise<GenerateAndRunResponse> {
    return this.request<GenerateAndRunResponse>('/api/generate-and-run', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getHistory(limit: number = 50): Promise<QueryHistoryResponse> {
    return this.request<QueryHistoryResponse>(`/api/history?limit=${limit}`);
  }
}

export const apiClient = new ApiClient();
