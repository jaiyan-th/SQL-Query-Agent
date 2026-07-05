/**
 * API client for QueryGen AI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  database_type?: string;
  message: string;
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
  status: string;
  sql: string;
  explanation: string;
  tables_used: string[];
  confidence: number;
  safety_status: string;
  schema_context: SchemaContext[];
  needs_clarification?: boolean;
  clarification_question?: string | null;
}

export interface GenerateAndRunResponse {
  status: string;
  sql: string;
  explanation: string;
  columns: string[];
  rows: any[][];
  row_count: number;
  execution_status: string;
  execution_time_ms?: number | null;
  output_format?: string;
  chart_config?: any;
  text_response?: string;
  report?: string;
  analysis?: string;
  guardrail_report?: any;
  schema_context: SchemaContext[];
  safety_status: string;
  error_message?: string | null;
  query_id?: number | null;
}

export interface QueryHistoryItem {
  id: number;
  question: string;
  generated_sql: string;
  mode: string;
  status: string;
  created_at: string;
  error_message?: string | null;
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

    return response.json();
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
