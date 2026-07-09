import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { 
  SqliteUploadOnboarding, 
  type QueryAgentStep 
} from '../../components/query-agent/SqliteUploadOnboarding';
import { QueryInput } from '../../components/query-agent/QueryInput';
import { QueryResult } from '../../components/query-agent/QueryResult';
import { ResultTable } from '../../components/query-agent/ResultTable';
import { WorkspaceStatusCard } from '../../components/query-agent/WorkspaceStatusCard';
import { RagContextPanel } from '../../components/query-agent/RagContextPanel';
import { GuardrailStatusCard } from '../../components/query-agent/GuardrailStatusCard';
import { 
  uploadSqliteFile, 
  getActiveSqliteWorkspace, 
  deleteActiveSqliteWorkspace,
  ingestSchema, 
  generateQuery, 
  generateAndRun,
  type ActiveSqliteWorkspaceResponse,
  type GenerateQueryResponse,
  type GenerateAndRunResponse
} from '../../services/api';

export const QueryAgentPage: React.FC = () => {
  const [step, setStep] = useState<QueryAgentStep>('NEED_SQLITE_UPLOAD');
  const [workspace, setWorkspace] = useState<ActiveSqliteWorkspaceResponse | null>(null);
  
  // Query state
  const [question, setQuestion] = useState('');
  const [queryMode, setQueryMode] = useState<'generate' | 'execute'>('execute');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<GenerateQueryResponse | GenerateAndRunResponse | null>(null);
  
  // Ingest animation
  const [ingestAnimStep, setIngestAnimStep] = useState(0);
  
  // Statuses
  const [error, setError] = useState('');
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  // Load session on mount
  useEffect(() => {
    loadActiveWorkspace();
  }, []);

  const loadActiveWorkspace = async () => {
    try {
      setError('');
      const ws = await getActiveSqliteWorkspace();
      if (ws.has_active_sqlite) {
        setWorkspace(ws);
        if (ws.schema_indexed) {
          setStep('READY_TO_ASK');
        } else {
          setStep('SQLITE_UPLOADED');
        }
      } else {
        setWorkspace(null);
        setStep('NEED_SQLITE_UPLOAD');
      }
    } catch (err: any) {
      console.error('Failed to load active SQLite workspace', err);
    }
  };

  // Ingest animation sequence
  useEffect(() => {
    let t: any;
    if (step === 'SCHEMA_INDEXING') {
      setIngestAnimStep(0);
      t = setInterval(() => {
        setIngestAnimStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 1200);
    }
    return () => { if (t) clearInterval(t); };
  }, [step]);

  // Sidebar Upload Trigger link callback
  const handleUploadClick = () => {
    if (step === 'NEED_SQLITE_UPLOAD' || step === 'SQLITE_UPLOADED' || step === 'READY_TO_ASK') {
      hiddenFileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleFileSelected = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['db', 'sqlite', 'sqlite3'].includes(ext)) {
      setError('Unsupported file type. Please upload a .db, .sqlite, or .sqlite3 file.');
      return;
    }

    try {
      setError('');
      setStep('SQLITE_UPLOADING');
      
      // Upload file
      await uploadSqliteFile(file);
      
      // Refresh active workspace metadata
      const ws = await getActiveSqliteWorkspace();
      setWorkspace(ws);
      setStep('SQLITE_UPLOADED');
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
      setStep('ERROR');
    }
  };

  const handleIngestSchema = async () => {
    try {
      setError('');
      setStep('SCHEMA_INDEXING');
      
      // Index schema
      const res = await ingestSchema();
      if (!res.success) {
        throw new Error(res.message || 'Schema indexing failed.');
      }
      
      // Refresh workspace metadata
      const ws = await getActiveSqliteWorkspace();
      setWorkspace(ws);
      setStep('READY_TO_ASK');
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('unable to open database file') || errMsg.includes('sqlite3.OperationalError') || errMsg.includes('database.sqlite')) {
        setError("Schema indexing failed because the uploaded SQLite workspace file could not be opened. Please reset the workspace and upload the database again.");
      } else if (errMsg.includes('Vector database index setup failed') || errMsg.includes('payload index') || errMsg.includes('Qdrant')) {
        setError("Schema indexing failed because the vector database payload index is not configured. Please retry after backend index repair.");
      } else {
        setError(errMsg || 'Schema indexing failed.');
      }
      setStep('ERROR');
    }
  };

  const handleResetWorkspace = async () => {
    try {
      await deleteActiveSqliteWorkspace();
    } catch (err) {
      console.error(err);
    }
    setWorkspace(null);
    setQueryResult(null);
    setQuestion('');
    setError('');
    setStep('NEED_SQLITE_UPLOAD');
  };

  const handleRetryIngestion = () => {
    setError('');
    setStep('SQLITE_UPLOADED');
  };

  const handleQuerySubmit = async () => {
    if (!question.trim() || queryLoading) return;
    
    try {
      setError('');
      setQueryLoading(true);
      setQueryResult(null);

      let res;
      if (queryMode === 'generate') {
        res = await generateQuery(question.trim());
      } else {
        res = await generateAndRun(question.trim());
      }

      setQueryResult(res);
    } catch (err: any) {
      setError(err.message || 'Query execution failed.');
    } finally {
      setQueryLoading(false);
    }
  };

  const handleReplaceWorkspace = async () => {
    if (!window.confirm('Delete this SQLite database workspace? This will remove the SQLite file and clear all index points from Qdrant Cloud.')) return;
    try {
      await deleteActiveSqliteWorkspace();
      setWorkspace(null);
      setQueryResult(null);
      setQuestion('');
      setStep('NEED_SQLITE_UPLOAD');
    } catch (err: any) {
      setError(err.message || 'Failed to remove workspace.');
    }
  };

  // Helper properties
  const isReady = step === 'READY_TO_ASK';
  const showOnboarding = !isReady && step !== 'ERROR';
  
  return (
    <DashboardLayout onUploadClick={handleUploadClick}>
      {/* Hidden file input triggered by sidebar click */}
      <input 
        type="file" 
        ref={hiddenFileInputRef} 
        onChange={handleFileChange}
        accept=".db,.sqlite,.sqlite3"
        className="hidden" 
      />

      <div className="flex flex-col gap-6 text-left">
        {/* Header Title Section */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold font-display text-[#E6E8EF] tracking-tight">
              Query Agent
            </h2>
            <p className="text-xs text-[#7E8A99] mt-1 font-semibold leading-relaxed">
              Upload a SQLite database, index its schema with RAG, and ask natural language questions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-chip info select-none">SQLITE_WORKSPACE</span>
            {workspace?.schema_indexed && <span className="status-chip info select-none">QDRANT_INDEXED</span>}
            <span className="status-chip executed select-none">SELECT_ONLY</span>
            {workspace && (
              <button 
                onClick={handleReplaceWorkspace}
                className="btn-danger h-[30px] px-3 font-mono text-[10px] uppercase font-bold"
              >
                Delete Workspace
              </button>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && step !== 'ERROR' && (
          <div className="bg-[#EF5F5F]/5 border border-[#EF5F5F]/35 text-[#EF5F5F] px-4 py-3 rounded text-xs font-mono-code font-bold">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Grid Workspace */}
        <div className="query-agent-grid items-start">
          {/* Left Column: Flow & Results */}
          <div className="flex flex-col gap-6">
            {showOnboarding ? (
              <SqliteUploadOnboarding
                step={step}
                workspace={workspace}
                onFileSelected={handleFileSelected}
                onIngestSchema={handleIngestSchema}
                ingestAnimStep={ingestAnimStep}
                error={error}
              />
            ) : step === 'ERROR' ? (
              <div className="terminal-card p-6 flex flex-col gap-4 items-center justify-center min-h-[220px]">
                <span className="text-[#EF5F5F] text-3xl">⚠️</span>
                <h4 className="text-sm font-bold text-[#E6E8EF]">An error occurred during onboarding</h4>
                <p className="text-xs text-[#7E8A99] max-w-md text-center">{error}</p>
                <div className="flex gap-4 mt-2">
                  <button 
                    onClick={handleRetryIngestion} 
                    className="btn-primary px-4 py-2 text-xs"
                  >
                    Retry Ingestion
                  </button>
                  <button 
                    onClick={handleResetWorkspace} 
                    className="btn-danger px-4 py-2 text-xs"
                  >
                    Reset Workspace
                  </button>
                </div>
              </div>
            ) : (
              <QueryInput
                question={question}
                setQuestion={setQuestion}
                queryMode={queryMode}
                setQueryMode={setQueryMode}
                onSubmit={handleQuerySubmit}
                loading={queryLoading}
                disabled={!isReady}
              />
            )}

            {/* Results Display */}
            {queryResult && !queryLoading && (
              <div className="flex flex-col gap-6 border-t border-[#252B36]/60 pt-6">
                <QueryResult 
                  sql={queryResult.generated_sql || queryResult.sql || ''} 
                  explanation={queryResult.explanation} 
                />

                {queryMode === 'execute' && 'rows' in queryResult && (
                  <ResultTable
                    columns={queryResult.columns || []}
                    rows={queryResult.rows || []}
                    rowCount={queryResult.row_count || 0}
                    executionTimeMs={queryResult.execution_time_ms}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right Column: Status Panels */}
          <div className="flex flex-col gap-6">
            <WorkspaceStatusCard workspace={workspace} />
            
            <RagContextPanel 
              contexts={queryResult?.schema_context || []} 
              loading={queryLoading} 
            />

            <GuardrailStatusCard
              guardrailStatus={queryResult?.guardrail_status || 'idle'}
              safetyStatus={queryResult?.safety_status || 'idle'}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
