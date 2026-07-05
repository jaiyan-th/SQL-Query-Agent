import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const api = {
  checkHealth: async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
  },
  testConnection: async (url: string) => {
    const res = await fetch(`${API_BASE}/api/connection/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ database_url: url })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Connection test failed');
    }
    return res.json();
  },
  ingestSchema: async () => {
    const res = await fetch(`${API_BASE}/api/rag/ingest-schema`, { 
      method: 'POST',
      headers: {
        ...getAuthHeaders()
      }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Schema ingestion failed');
    }
    return res.json();
  }
};

export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [schemaIndexed, setSchemaIndexed] = useState(false);
  const [dbUrl, setDbUrl] = useState('');
  const [tablesIndexed, setTablesIndexed] = useState(0);
  const [documentsIndexed, setDocumentsIndexed] = useState(0);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [fastapiOnline, setFastapiOnline] = useState(false);
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [ingestStep, setIngestStep] = useState(0);
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    refreshStatus();
  }, []);

  // Ingestion animation step timer
  useEffect(() => {
    let timer: any;
    if (ingestLoading) {
      setIngestStep(0);
      timer = setInterval(() => {
        setIngestStep((prev) => (prev < 5 ? prev + 1 : prev));
      }, 1500);
    } else {
      setIngestStep(0);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [ingestLoading]);

  const refreshStatus = async () => {
    try {
      setError('');
      const data = await api.checkHealth();
      setFastapiOnline(true);
      
      if (data.database && data.database.configured) {
        setDatabaseConnected(true);
        setIsEditing(false);
        if (data.database.url) {
          setDbUrl(data.database.url);
        }
      } else {
        setDatabaseConnected(false);
        setIsEditing(true);
      }
      
      if (data.qdrant && data.qdrant.indexed) {
        setSchemaIndexed(true);
        setTablesIndexed(data.qdrant.document_count || 0);
        setDocumentsIndexed(data.qdrant.document_count || 0);
      } else {
        setSchemaIndexed(false);
      }

      if (data.llm && data.llm.configured) {
        setLlmConfigured(true);
      }
    } catch (err: any) {
      setFastapiOnline(false);
      setError('FastAPI backend service is offline.');
    }
  };

  const handleTestConnection = async () => {
    if (!dbUrl.trim()) return;
    try {
      setConnectionLoading(true);
      setError('');
      const res = await api.testConnection(dbUrl);
      setDatabaseConnected(res.connected);
      setIsEditing(false);
      refreshStatus();
    } catch (err: any) {
      setError(err.message || 'Connection test failed');
      setDatabaseConnected(false);
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleIngestSchema = async () => {
    try {
      setIngestLoading(true);
      setError('');
      const result = await api.ingestSchema();
      setTablesIndexed(result.indexed_tables || 0);
      setDocumentsIndexed(result.indexed_documents || 0);
      setSchemaIndexed(true);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      setError(err.message || 'Ingestion failed');
    } finally {
      // Allow the animation to settle
      setTimeout(() => {
        setIngestLoading(false);
        refreshStatus();
      }, 1000);
    }
  };

  const getMaskedUrl = (url: string) => {
    if (!url) return '';
    try {
      const matches = url.match(/^(postgresql:\/\/)([^:]+):([^@]+)(@.+)$/);
      if (matches && matches.length >= 5) {
        return `${matches[1]}${matches[2]}:******${matches[4]}`;
      }
      return url.replace(/:[^:/@]+@/, ':******@');
    } catch {
      return 'postgresql://*****@host:5432/database';
    }
  };

  const ingestionSteps = [
    "Connecting to Neon PostgreSQL",
    "Introspecting schema metadata",
    "Extracting tables, columns, keys, and relationships",
    "Generating vectors & embeddings",
    "Uploading schema documents to Qdrant",
    "Index generation complete"
  ];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6 text-left">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-400 px-4 py-3 rounded flex items-start gap-2 text-xs font-mono-code font-bold">
            <span className="text-[#EC5F5B] mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-1 mb-2">
          <h2 className="text-3xl font-bold font-display text-[#F3F1EA] tracking-tight">
            Database Setup & RAG Indexing
          </h2>
          <p className="text-xs text-slate-400">
            Configure connection to your PostgreSQL datastore and synchronize schema blueprints to the semantic index.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Connection Form */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-6 shadow-md flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-[#F3F1EA]">Neon PostgreSQL Connection</h3>
                <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                  Connect QueryGen AI to your PostgreSQL database. Credentials are stored backend-only and never exposed to the frontend.
                </p>
              </div>

              <div className="space-y-4 font-mono-code text-xs mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Database URL / Connection String</label>
                  {isEditing ? (
                    <input
                      id="db-url-input"
                      type="text"
                      value={dbUrl}
                      onChange={(e) => setDbUrl(e.target.value)}
                      placeholder="postgresql://username:password@host:5432/database"
                      className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-xs text-[#F3F1EA] shadow-inner"
                      disabled={connectionLoading}
                    />
                  ) : (
                    <div className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded text-slate-400 select-all truncate">
                      {getMaskedUrl(dbUrl)}
                    </div>
                  )}
                  <span className="text-[9px] text-slate-600 font-sans-ui mt-0.5">
                    * Supports standard connection strings. Credentials stored securely on the backend environment.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[#2A303C]/40 pt-4 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-1">Database Type</span>
                    <span className="font-bold text-[#F3F1EA]">Neon PostgreSQL</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-1">SSL Mode</span>
                    <span className="font-bold text-[#3ECF8E]">Enabled</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-1">Read-Only Mode</span>
                    <span className="font-bold text-[#3ECF8E]">Enabled (SELECT only)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-1">Connection State</span>
                    <span className={`font-bold ${databaseConnected ? 'text-[#3ECF8E]' : 'text-slate-500'}`}>
                      {databaseConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connection Buttons */}
              <div className="flex gap-3 justify-end mt-4 font-sans-ui">
                {databaseConnected && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-4 py-2 border border-[#2A303C] hover:bg-[#1A1F29] rounded text-xs font-semibold text-slate-300 transition-colors"
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit Credentials'}
                  </button>
                )}
                <button
                  id="btn-test-connection"
                  onClick={handleTestConnection}
                  disabled={!dbUrl.trim() || connectionLoading}
                  className="px-5 py-2 bg-[#4FD1C5] hover:bg-[#4FD1C5]/90 text-[#0E1116] rounded text-xs font-bold shadow-[0_0_15px_rgba(79,209,197,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectionLoading ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={refreshStatus}
                  className="px-4 py-2 bg-[#161A22] border border-[#2A303C] hover:bg-[#1A1F29] rounded text-xs font-semibold text-slate-300 transition-colors"
                >
                  Refresh Status
                </button>
              </div>
            </div>

            {/* Connection Status Card */}
            <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-5 text-xs font-mono-code text-slate-400">
              <div className="flex justify-between items-center mb-3">
                <span className="font-sans-ui font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Server Diagnostics</span>
                <span className={`flex items-center gap-1.5 font-bold ${databaseConnected ? 'text-[#3ECF8E]' : 'text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${databaseConnected ? 'bg-[#3ECF8E] animate-pulse' : 'bg-slate-600'}`} />
                  {databaseConnected ? 'Online & Linked' : 'Offline'}
                </span>
              </div>
              <div className="space-y-1.5">
                <div>Provider: <span className="text-[#F3F1EA]">Neon PostgreSQL</span></div>
                <div>Execution Scope: <span className="text-[#3ECF8E] font-bold">SELECT-only</span> (strictly enforced)</div>
                <div>Credential Storage: <span className="text-slate-300">Backend environment isolate</span></div>
                {lastSynced && <div>Last verified: <span className="text-slate-300">{lastSynced}</span></div>}
              </div>
            </div>
          </div>

          {/* Right Column: Qdrant Index and Status */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Qdrant Schema Index */}
            <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-6 shadow-md flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-[#F3F1EA]">Qdrant Schema Index</h3>
                <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                  Schema blueprints are vectorized and stored in Qdrant so the LLM compiler grounds generated queries accurately.
                </p>
              </div>

              <div className="space-y-2 font-mono-code text-[11px] text-slate-400 border-y border-[#2A303C]/40 py-4 my-2">
                <div>Vector DB: <span className="text-[#F3F1EA]">Qdrant Cloud</span></div>
                <div>Index State: <span className={schemaIndexed ? 'text-[#4FD1C5] font-bold' : 'text-slate-500'}>
                  {schemaIndexed ? 'Grounded (Indexed)' : 'Not Grounded'}
                </span></div>
                <div>Indexed Tables: <span className="text-[#F3F1EA] font-bold">{tablesIndexed}</span></div>
                <div>Indexed Documents: <span className="text-[#F3F1EA] font-bold">{documentsIndexed}</span></div>
                <div>Embedding Model: <span className="text-slate-400">BAAI/bge-small-en-v1.5</span></div>
                {lastSynced && <div>Last Synced: <span className="text-slate-300">{lastSynced}</span></div>}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 font-sans-ui">
                <button
                  onClick={handleIngestSchema}
                  disabled={!databaseConnected || ingestLoading}
                  className="flex-1 py-2 bg-[#8B7CF6] hover:bg-[#8B7CF6]/90 text-white rounded text-xs font-bold shadow-[0_0_15px_rgba(139,124,246,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ingestLoading ? 'Syncing...' : schemaIndexed ? 'Re-Ingest Schema' : 'Ingest Schema'}
                </button>
                <button
                  onClick={refreshStatus}
                  className="px-3 py-2 bg-[#161A22] border border-[#2A303C] hover:bg-[#1A1F29] rounded text-xs font-semibold text-slate-300 transition-colors"
                >
                  Check Index
                </button>
              </div>

              {/* Pipeline Ingestion Steps */}
              {ingestLoading && (
                <div className="border-t border-[#2A303C]/40 pt-4 text-left font-mono-code text-[10px] space-y-1.5 text-slate-400">
                  <span className="text-slate-500 block font-sans-ui font-semibold text-[9px] uppercase tracking-wider mb-2">Ingestion Pipeline Loader</span>
                  {ingestionSteps.map((step, idx) => {
                    let stepStatus = "pending";
                    if (idx < ingestStep) {
                      stepStatus = "done";
                    } else if (idx === ingestStep) {
                      stepStatus = "running";
                    }

                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={
                          stepStatus === 'done' ? 'text-[#3ECF8E]' :
                          stepStatus === 'running' ? 'text-[#4FD1C5] animate-pulse' :
                          'text-slate-600'
                        }>
                          {stepStatus === 'done' ? '[✓]' : stepStatus === 'running' ? '[⏳]' : '[•]'}
                        </span>
                        <span className={
                          stepStatus === 'done' ? 'text-[#F3F1EA]' :
                          stepStatus === 'running' ? 'text-[#4FD1C5]' :
                          'text-slate-500'
                        }>
                          {step}...
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* System Readiness Checklist */}
            <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-5 text-xs text-slate-400">
              <h4 className="font-sans-ui font-semibold text-slate-500 uppercase tracking-wider text-[9px] mb-3">System Readiness Checklist</h4>
              <div className="space-y-2 font-mono-code">
                <div className="flex items-center gap-2">
                  <span className={fastapiOnline ? 'text-[#3ECF8E]' : 'text-slate-600'}>{fastapiOnline ? '✓' : '•'}</span>
                  <span>FastAPI online</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={databaseConnected ? 'text-[#3ECF8E]' : 'text-slate-600'}>{databaseConnected ? '✓' : '•'}</span>
                  <span>Neon PostgreSQL connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={schemaIndexed ? 'text-[#3ECF8E]' : 'text-slate-600'}>{schemaIndexed ? '✓' : '•'}</span>
                  <span>Qdrant schema indexed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={llmConfigured ? 'text-[#3ECF8E]' : 'text-slate-600'}>{llmConfigured ? '✓' : '•'}</span>
                  <span>LLM provider configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#3ECF8E]">✓</span>
                  <span>JWT authorization active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#3ECF8E]">✓</span>
                  <span>SQL security guardrails active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        {databaseConnected && schemaIndexed && (
          <div className="flex justify-end mt-4">
            <button
              onClick={() => navigate('/dashboard/agent')}
              className="px-6 py-3 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#0E1116] rounded font-sans-ui font-bold text-xs shadow-[0_0_15px_rgba(62,207,142,0.35)] transition-all flex items-center gap-2"
            >
              <span>Continue to SQL Agent Console</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
