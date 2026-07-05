import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };
};

export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [connectionName, setConnectionName] = useState('My Database');
  const [databaseType, setDatabaseType] = useState('postgresql');
  const [dbUrl, setDbUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Connection states
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const [schemaStatus, setSchemaStatus] = useState<any>(null);
  
  // Loading & Action states
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestStep, setIngestStep] = useState(0);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    fetchActiveConnection();
  }, []);

  const fetchActiveConnection = async () => {
    try {
      setError('');
      const connRes = await fetch(`${API_BASE}/api/connections/active`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (connRes.ok) {
        const connData = await connRes.json();
        setActiveConnection(connData);
        setDbUrl(connData.masked_url);
        setDatabaseType(connData.database_type);
        setIsEditing(false);
        setTestSuccess(true);
        
        // Fetch RAG sync status for this active connection
        fetchRAGStatus();
      } else {
        setActiveConnection(null);
        setIsEditing(true);
      }
    } catch (err: any) {
      console.error('Failed to load active connection details');
    }
  };

  const fetchRAGStatus = async () => {
    try {
      const ragRes = await fetch(`${API_BASE}/api/rag/status`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (ragRes.ok) {
        const ragData = await ragRes.json();
        setSchemaStatus(ragData);
      }
    } catch (err: any) {
      console.error('Failed to load RAG status details');
    }
  };


  const handleTestConnection = async () => {
    if (!dbUrl.trim()) return;
    try {
      setConnectionLoading(true);
      setError('');
      setTestSuccess(null);

      const res = await fetch(`${API_BASE}/api/connections/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          database_type: databaseType,
          database_url: dbUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Connection test failed');
      }

      setTestSuccess(data.connected);
    } catch (err: any) {
      setError(err.message || 'Connection test failed');
      setTestSuccess(false);
    } finally {
      setConnectionLoading(false);
    }
  };


  const handleSaveConnection = async () => {
    if (!dbUrl.trim() || !testSuccess) return;
    try {
      setSaveLoading(true);
      setError('');

      const res = await fetch(`${API_BASE}/api/connections/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          connection_name: connectionName,
          database_type: databaseType,
          database_url: dbUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save connection settings');
      }

      setIsEditing(false);
      fetchActiveConnection();
    } catch (err: any) {
      setError(err.message || 'Failed to save connection details');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleIngestSchema = async () => {
    try {
      setIngestLoading(true);
      setError('');
      setIngestStep(0);

      // Ingestion loader animation interval
      const timer = setInterval(() => {
        setIngestStep((prev) => (prev < 5 ? prev + 1 : prev));
      }, 1200);

      const res = await fetch(`${API_BASE}/api/rag/ingest-schema`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      clearInterval(timer);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'RAG schema indexing failed');
      }

      setIngestStep(5);
      fetchRAGStatus();
    } catch (err: any) {
      setError(err.message || 'Schema sync failed');
    } finally {
      setTimeout(() => {
        setIngestLoading(false);
      }, 1000);
    }
  };

  const handleClear = () => {
    setDbUrl('');
    setTestSuccess(null);
    setError('');
  };


  const getPlaceholder = () => {
    switch (databaseType) {
      case 'postgresql':
        return 'postgresql://username:password@host:5432/database?sslmode=require';
      case 'mysql':
        return 'mysql+pymysql://username:password@host:3306/database';
      case 'mariadb':
        return 'mariadb+pymysql://username:password@host:3306/database';
      case 'sqlite':
        return 'sqlite:///path/to/database.db';
      case 'mssql':
        return 'mssql+pyodbc://username:password@host:1433/database?driver=ODBC+Driver+17+for+SQL+Server';
      default:
        return 'Enter database connection string';
    }
  };

  const ingestionSteps = [
    "Establishing user database handle",
    "Introspecting schema tables & columns",
    "Filtering out administrative tables",
    "Generating embeddings via fastembed",
    "Uploading schema points to Qdrant Cloud",
    "Indexing operation successfully completed"
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
            Connect Your Database
          </h2>
          <p className="text-xs text-slate-400">
            Connect a supported SQL database, sync its schema into Qdrant, and start asking questions in natural language.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Database Connection Settings */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-6 shadow-md flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-[#F3F1EA]">User Database Connection</h3>
                <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                  Paste the connection URL of the database you want to query. QueryGen AI stores it encrypted backend-only and uses it only for schema sync and safe SELECT-only execution.
                </p>
              </div>

              <div className="space-y-4 font-mono-code text-xs mt-2">
                
                {/* Connection Name */}
                {isEditing && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Connection Name</label>
                    <input
                      type="text"
                      value={connectionName}
                      onChange={(e) => setConnectionName(e.target.value)}
                      placeholder="My Sales Database"
                      className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-xs text-[#F3F1EA] shadow-inner font-mono"
                    />
                  </div>
                )}

                {/* Database Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Database Type</label>
                  {isEditing ? (
                    <select
                      value={databaseType}
                      onChange={(e) => {
                        setDatabaseType(e.target.value);
                        setTestSuccess(null);
                      }}
                      className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-xs text-[#F3F1EA] font-sans-ui"
                    >
                      <option value="postgresql">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                      <option value="mariadb">MariaDB</option>
                      <option value="sqlite">SQLite (Local file path)</option>
                      <option value="mssql">SQL Server</option>
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded text-slate-300 font-sans-ui font-semibold">
                      {activeConnection?.provider}
                    </div>
                  )}
                </div>

                {/* Connection URL */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Connection URL</label>
                    {isEditing && (
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-[#4FD1C5] font-sans-ui font-semibold hover:underline"
                      >
                        {showPassword ? 'Hide Secret' : 'Show Secret'}
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      type={showPassword ? "text" : "password"}
                      value={dbUrl}
                      onChange={(e) => {
                        setDbUrl(e.target.value);
                        setTestSuccess(null);
                      }}
                      placeholder={getPlaceholder()}
                      className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-xs text-[#F3F1EA] shadow-inner font-mono"
                      disabled={connectionLoading}
                    />
                  ) : (
                    <div className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded text-slate-400 select-all truncate font-mono">
                      {activeConnection?.masked_url}
                    </div>
                  )}
                  <span className="text-[9px] text-slate-600 font-sans-ui mt-0.5 leading-normal">
                    * Connection credentials are cryptographically encrypted using Fernet keys before saving.
                  </span>
                </div>

                {/* Masked Metadata status grids */}
                {activeConnection && !isEditing && (
                  <div className="grid grid-cols-2 gap-4 border-t border-[#2A303C]/40 pt-4 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5">Connection Status</span>
                      <span className="font-bold text-[#3ECF8E]">CONNECTED & ACTIVE</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5">Target Host</span>
                      <span className="font-bold text-[#F3F1EA]">{activeConnection.host}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5">Target Database</span>
                      <span className="font-bold text-[#F3F1EA]">{activeConnection.database_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5">Credentials</span>
                      <span className="font-bold text-[#8B7CF6]">Encrypted backend-only</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5">Execution Scope</span>
                      <span className="font-bold text-[#3ECF8E]">SELECT-only</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Connection Buttons */}
              <div className="flex gap-3 justify-end mt-4 font-sans-ui">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleClear}
                      className="px-4 py-2 border border-[#2A303C] hover:bg-[#1A1F29] rounded text-xs font-semibold text-slate-300 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleTestConnection}
                      disabled={!dbUrl.trim() || connectionLoading}
                      className="px-5 py-2 bg-[#4FD1C5] hover:bg-[#4FD1C5]/90 text-[#0E1116] rounded text-xs font-bold shadow-[0_0_15px_rgba(79,209,197,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connectionLoading ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      onClick={handleSaveConnection}
                      disabled={!testSuccess || saveLoading}
                      className="px-5 py-2 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#0E1116] rounded text-xs font-bold shadow-[0_0_15px_rgba(62,207,142,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saveLoading ? 'Saving...' : 'Save Connection'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setTestSuccess(null);
                      setDbUrl('');
                    }}
                    className="px-4 py-2 border border-[#2A303C] hover:bg-[#1A1F29] rounded text-xs font-semibold text-slate-300 transition-colors"
                  >
                    Edit Credentials / Connect Another
                  </button>
                )}
              </div>
            </div>

            {/* Architecture Info Box */}
            <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-5 text-xs font-mono-code text-slate-400">
              <div className="flex justify-between items-center mb-3 border-b border-[#2A303C]/40 pb-2">
                <span className="font-sans-ui font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Storage Architecture</span>
                <span className="text-[#3ECF8E] font-bold font-sans-ui text-[9px] uppercase tracking-wider">Zero-copy Isolation</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 mb-2 font-sans-ui font-semibold">
                Your app account, encrypted connection settings, and query history are stored in the platform database. Your actual database records remain in your connected database. Qdrant stores only schema embeddings, not database passwords or table rows.
              </p>
            </div>
          </div>

          {/* Right Column: Qdrant Index and System Readiness */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Qdrant Schema Index */}
            <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-6 shadow-md flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-[#F3F1EA]">Qdrant Schema Index</h3>
                <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                  Vectorize database table architectures and save schemas inside Qdrant Cloud. RAG embeddings ground SQL compiler requests in the query agent.
                </p>
              </div>

              <div className="space-y-2 font-mono-code text-[11px] text-slate-400 border-y border-[#2A303C]/40 py-4 my-2">
                <div>Vector Store: <span className="text-[#F3F1EA]">Qdrant Cloud</span></div>
                <div>Index State: <span className={schemaStatus?.indexed ? 'text-[#4FD1C5] font-bold' : 'text-slate-500'}>
                  {schemaStatus?.indexed ? 'GROUNDED (INDEXED)' : 'NOT SYNCED'}
                </span></div>
                {schemaStatus?.indexed && (
                  <>
                    <div>Indexed Tables: <span className="text-[#F3F1EA] font-bold">{schemaStatus.indexed_tables}</span></div>
                    <div>Indexed Chunks: <span className="text-[#F3F1EA] font-bold">{schemaStatus.indexed_documents}</span></div>
                  </>
                )}
                <div>Embedding Engine: <span className="text-slate-500">BAAI/bge-small-en-v1.5</span></div>
              </div>

              {/* Ingest Action Buttons */}
              <div className="flex gap-3 font-sans-ui">
                <button
                  onClick={handleIngestSchema}
                  disabled={!activeConnection || ingestLoading}
                  className="flex-1 py-2 bg-[#8B7CF6] hover:bg-[#8B7CF6]/90 text-white rounded text-xs font-bold shadow-[0_0_15px_rgba(139,124,246,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ingestLoading ? 'Syncing...' : schemaStatus?.indexed ? 'Re-Sync Schema' : 'Sync Schema to Qdrant'}
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
                  <span className={activeConnection ? 'text-[#3ECF8E]' : 'text-slate-600'}>{activeConnection ? '✓' : '•'}</span>
                  <span>Database connection save successful</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={schemaStatus?.indexed ? 'text-[#3ECF8E]' : 'text-slate-600'}>{schemaStatus?.indexed ? '✓' : '•'}</span>
                  <span>Qdrant schema indexed</span>
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
        {activeConnection && schemaStatus?.indexed && (
          <div className="flex justify-end mt-4">
            <button
              onClick={() => navigate('/dashboard/agent')}
              className="px-6 py-3 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#0E1116] rounded font-sans-ui font-bold text-xs shadow-[0_0_15px_rgba(62,207,142,0.35)] transition-all flex items-center gap-2"
            >
              <span>Continue to SQL Agent</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
