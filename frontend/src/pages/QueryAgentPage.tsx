import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  uploadSqliteFile, getActiveSqliteWorkspace, deleteActiveSqliteWorkspace,
  ingestSchema, generateQuery, generateAndRun,
  type UploadSqliteResponse, type ActiveSqliteWorkspaceResponse,
  type GenerateQueryResponse, type GenerateAndRunResponse,
} from '../services/api';

// ─── State machine ────────────────────────────────────────────────────────────
type QueryAgentStep =
  | 'NEED_SQLITE_UPLOAD'
  | 'SQLITE_UPLOADING'
  | 'SQLITE_UPLOADED'
  | 'SCHEMA_INDEXING'
  | 'SCHEMA_INDEXED'
  | 'READY_TO_ASK'
  | 'ERROR';

type QueryMode = 'generate' | 'execute';

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
  time?: string;
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────────
export const QueryAgentPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);

  const [step, setStep] = useState<QueryAgentStep>('NEED_SQLITE_UPLOAD');
  const [workspace, setWorkspace] = useState<ActiveSqliteWorkspaceResponse | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadSqliteResponse | null>(null);
  const [ingestResult, setIngestResult] = useState<{ indexed_tables: number } | null>(null);
  const [ingestAnimStep, setIngestAnimStep] = useState(0);
  const [queryMode, setQueryMode] = useState<QueryMode>('execute');
  const [question, setQuestion] = useState('');
  const [queryResult, setQueryResult] = useState<GenerateAndRunResponse | GenerateQueryResponse | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryAnimStep, setQueryAnimStep] = useState(0);
  const [error, setError] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([
    { from: 'bot', text: 'Welcome to QueryGen AI. Please upload your SQLite database file to start.', time: now() },
  ]);

  const pushBot = useCallback((text: string) => {
    setChat(prev => [...prev, { from: 'bot', text, time: now() }]);
  }, []);
  const pushUser = useCallback((text: string) => {
    setChat(prev => [...prev, { from: 'user', text, time: now() }]);
  }, []);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  // On mount: restore session if workspace already exists
  useEffect(() => {
    (async () => {
      try {
        const ws = await getActiveSqliteWorkspace();
        if (ws.has_active_sqlite) {
          setWorkspace(ws);
          if (ws.schema_indexed) {
            setStep('READY_TO_ASK');
            setChat([
              { from: 'bot', text: `Welcome back! Your SQLite database "${ws.original_filename}" is ready.`, time: now() },
              { from: 'bot', text: 'Schema is indexed. You can ask questions below.', time: now() },
            ]);
          } else {
            setStep('SQLITE_UPLOADED');
            setChat([
              { from: 'bot', text: `Welcome back! "${ws.original_filename}" is uploaded but schema is not yet indexed.`, time: now() },
              { from: 'bot', text: 'Click "Extract & Index Schema" to continue.', time: now() },
            ]);
          }
        }
      } catch { /* no session */ }
    })();
  }, []);

  // Ingest animation
  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    if (step === 'SCHEMA_INDEXING') {
      setIngestAnimStep(0);
      t = setInterval(() => setIngestAnimStep(p => p < 5 ? p + 1 : p), 1100);
    }
    return () => clearInterval(t);
  }, [step]);

  // Query pipeline animation
  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    if (queryLoading) {
      setQueryAnimStep(0);
      t = setInterval(() => setQueryAnimStep(p => p < 5 ? p + 1 : p), 1200);
    }
    return () => clearInterval(t);
  }, [queryLoading]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['db', 'sqlite', 'sqlite3'].includes(ext)) {
      setError('Unsupported file type. Please upload a .db, .sqlite, or .sqlite3 file.');
      return;
    }
    setError('');
    setStep('SQLITE_UPLOADING');
    pushUser(`Uploading: ${file.name}`);
    pushBot('Uploading and validating your SQLite database...');
    try {
      const res = await uploadSqliteFile(file);
      setUploadResult(res);
      const ws = await getActiveSqliteWorkspace();
      setWorkspace(ws);
      setStep('SQLITE_UPLOADED');
      pushBot(`SQLite database uploaded successfully.`);
      pushBot(`Found ${res.table_count} table(s) in "${res.original_filename}". Now extract and index your schema.`);
    } catch (err: any) {
      setStep('ERROR');
      setError(err.message || 'Upload failed.');
      pushBot(`Upload failed: ${err.message || 'Unknown error.'}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleIngestSchema = async () => {
    setStep('SCHEMA_INDEXING');
    setError('');
    pushBot('Extracting SQLite schema and indexing it in Qdrant...');
    try {
      const res = await ingestSchema();
      setIngestResult({ indexed_tables: res.indexed_tables });
      setStep('SCHEMA_INDEXED');
      pushBot(`Schema indexed successfully. ${res.indexed_tables} table(s) stored in Qdrant. You can now ask questions.`);
      setTimeout(() => setStep('READY_TO_ASK'), 800);
    } catch (err: any) {
      setStep('ERROR');
      setError(err.message || 'Schema indexing failed.');
      pushBot(`Schema indexing failed: ${err.message || 'Unknown error.'}`);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || queryLoading) return;
    const q = question.trim();
    setQuestion('');
    setQueryResult(null);
    setQueryLoading(true);
    setError('');
    pushUser(q);
    pushBot(queryMode === 'execute' ? 'Generating and executing SQL on your SQLite database...' : 'Generating SQL query...');
    try {
      const res = queryMode === 'execute' ? await generateAndRun(q) : await generateQuery(q);
      setQueryResult(res);
      setQueryLoading(false);
      pushBot('Query complete. See results below ↓');
    } catch (err: any) {
      setQueryLoading(false);
      setError(err.message || 'Query failed.');
      pushBot(`Query failed: ${err.message || 'Unknown error.'}`);
    }
  };

  const handleReplace = async () => {
    if (!confirm('Replace your current SQLite database? This will remove the existing workspace and schema index.')) return;
    try {
      await deleteActiveSqliteWorkspace();
      setWorkspace(null); setUploadResult(null); setIngestResult(null);
      setQueryResult(null); setError(''); setStep('NEED_SQLITE_UPLOAD');
      setChat([{ from: 'bot', text: 'Workspace removed. Please upload a new SQLite database file.', time: now() }]);
    } catch (err: any) {
      setError(err.message || 'Failed to remove workspace.');
    }
  };

  const handleNewQuery = () => {
    setQueryResult(null); setQuestion(''); setError('');
    questionRef.current?.focus();
  };

  const handleCopySQL = () => {
    const sql = (queryResult as any)?.generated_sql || (queryResult as any)?.sql || '';
    if (sql) navigator.clipboard.writeText(sql);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const renderSQL = (sql: string) => {
    if (!sql) return <span className="text-slate-500">-- No SQL generated</span>;
    const KW = new Set(['SELECT','FROM','WHERE','AND','OR','NOT','IN','IS','NULL','LIMIT','ORDER','BY','DESC','ASC','GROUP','HAVING','JOIN','LEFT','RIGHT','INNER','ON','AS','WITH','DISTINCT','COUNT','SUM','AVG','MIN','MAX','CASE','WHEN','THEN','ELSE','END','BETWEEN','LIKE']);
    return sql.split(/(\s+|\b)/).map((p, i) => {
      const u = p.trim().toUpperCase();
      if (KW.has(u)) return <span key={i} className="text-[#8B7CF6] font-bold">{p}</span>;
      if (/^\d+$/.test(p.trim())) return <span key={i} className="text-[#F5B942]">{p}</span>;
      if (/^'[^']*'$/.test(p.trim())) return <span key={i} className="text-[#3ECF8E]">{p}</span>;
      return <span key={i} className="text-[#F3F1EA]">{p}</span>;
    });
  };

  const ingestLabels = [
    'Opening SQLite database file',
    'Introspecting tables & columns',
    'Filtering internal platform tables',
    'Generating embeddings via fastembed',
    'Uploading schema vectors to Qdrant',
    'Schema indexing complete ✓',
  ];
  const queryLabels = [
    'Embedding question with BAAI/bge-small-en-v1.5',
    'Retrieving schema context from Qdrant',
    'Injecting schema into LLM prompt',
    'Running SQLite guardrail validation',
    'Connecting to uploaded SQLite file',
    'Executing safe SELECT query',
  ];

  const dot = (active: boolean, done: boolean) =>
    done ? '[✓]' : active ? '[⏳]' : '[·]';
  const dotCls = (active: boolean, done: boolean) =>
    done ? 'text-[#3ECF8E]' : active ? 'text-[#4FD1C5] animate-pulse' : 'text-slate-600';
  const labelCls = (active: boolean, done: boolean) =>
    done ? 'text-[#F3F1EA]' : active ? 'text-[#4FD1C5]' : 'text-slate-600';

  const isReady = step === 'READY_TO_ASK';
  const res = queryResult as any;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto flex flex-col gap-5 text-left">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold font-display text-[#F3F1EA] tracking-tight flex items-center gap-2">
              Query Agent
              <span className="text-[10px] font-mono-code bg-[#4FD1C5]/10 border border-[#4FD1C5]/30 text-[#4FD1C5] px-2 py-0.5 rounded font-bold">SQLite</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Upload a SQLite database, index schema, ask questions in plain English.</p>
          </div>
          {workspace?.has_active_sqlite && (
            <button onClick={handleReplace} className="px-3 py-1.5 border border-[#EC5F5B]/40 hover:border-[#EC5F5B] text-[#EC5F5B] rounded text-[10px] font-mono-code font-bold transition-all">
              Replace SQLite Database
            </button>
          )}
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 text-[10px] font-mono-code flex-wrap">
          {[
            { label: 'Upload SQLite', done: !['NEED_SQLITE_UPLOAD','SQLITE_UPLOADING','ERROR'].includes(step) },
            { label: 'Index Schema',  done: ['SCHEMA_INDEXED','READY_TO_ASK'].includes(step) },
            { label: 'Ask Question',  done: false },
          ].map((s, i) => (
            <React.Fragment key={i}>
              <span className={s.done ? 'text-[#3ECF8E] font-bold' : 'text-slate-500'}>
                {s.done ? '✓ ' : '· '}{s.label}
              </span>
              {i < 2 && <span className="text-slate-700">→</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Global error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-950/30 border border-red-800/60 rounded px-3 py-2 text-[11px] font-mono-code text-red-400">
            <span className="shrink-0 mt-0.5">⚠</span>
            <div className="flex-1">{error}</div>
            {step === 'ERROR' && (
              <button onClick={() => { setStep('NEED_SQLITE_UPLOAD'); setError(''); }} className="text-[#4FD1C5] font-bold hover:underline shrink-0">Retry</button>
            )}
          </div>
        )}

        {/* ── Chat window ─────────────────────────────────────────── */}
        <div className="bg-[#0E1116] border border-[#2A303C] rounded-[10px] flex flex-col" style={{ minHeight: 220 }}>
          <div className="terminal-header flex items-center gap-1.5 px-4 py-2 border-b border-[#2A303C] bg-[#161A22]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EC5F5B]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
            <span className="text-[10px] font-mono-code text-slate-500 ml-2">querygen_agent</span>
          </div>
          <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-56">
            {chat.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.from === 'bot' && <span className="text-[#4FD1C5] font-mono-code text-xs mt-0.5 shrink-0">AI:</span>}
                <div className={`text-[11px] font-mono-code px-3 py-1.5 rounded max-w-[80%] ${msg.from === 'bot' ? 'bg-[#161A22] text-[#F3F1EA] border border-[#2A303C]' : 'bg-[#4FD1C5]/10 text-[#4FD1C5] border border-[#4FD1C5]/30'}`}>
                  {msg.text}
                </div>
                {msg.from === 'user' && <span className="text-[#4FD1C5] font-mono-code text-xs mt-0.5 shrink-0">You</span>}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* ── Query pipeline animation ────────────────────────────── */}
        {queryLoading && (
          <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-5 flex flex-col gap-2">
            <h3 className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider font-bold mb-1">Processing Query...</h3>
            {queryLabels.map((label, i) => {
              const active = i === queryAnimStep; const done = i < queryAnimStep;
              return (
                <div key={i} className="flex items-center gap-2 text-[10px] font-mono-code">
                  <span className={`font-bold ${dotCls(active, done)}`}>{dot(active, done)}</span>
                  <span className={labelCls(active, done)}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Query result display ───────────────────────────────── */}
        {queryResult && !queryLoading && (
          <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider font-bold">Query Result</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleCopySQL} className="px-3 py-1.5 bg-[#4FD1C5]/10 border border-[#4FD1C5]/40 hover:border-[#4FD1C5] text-[#4FD1C5] rounded text-[10px] font-mono-code font-bold transition-all">
                  Copy SQL
                </button>
                <button onClick={handleNewQuery} className="px-3 py-1.5 bg-[#3ECF8E]/10 border border-[#3ECF8E]/40 hover:border-[#3ECF8E] text-[#3ECF8E] rounded text-[10px] font-mono-code font-bold transition-all">
                  New Query
                </button>
              </div>
            </div>

            {/* SQL display */}
            <div>
              <div className="text-[9px] font-mono-code text-slate-500 uppercase tracking-wider mb-1">Generated SQL</div>
              <div className="bg-[#0E1116] border border-[#2A303C] rounded p-3 overflow-x-auto">
                <pre className="text-[11px] font-mono-code whitespace-pre-wrap break-words">{renderSQL(res?.generated_sql || res?.sql || '')}</pre>
              </div>
            </div>

            {/* Explanation */}
            {res?.explanation && (
              <div>
                <div className="text-[9px] font-mono-code text-slate-500 uppercase tracking-wider mb-1">Explanation</div>
                <div className="bg-[#0E1116] border border-[#2A303C] rounded p-3 text-[11px] font-mono-code text-[#F3F1EA]">
                  {res.explanation}
                </div>
              </div>
            )}

            {/* Execution result (if queryMode === execute) */}
            {queryMode === 'execute' && res?.columns && res?.rows && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono-code text-slate-500 uppercase tracking-wider">Result Rows</span>
                    <span className="text-[9px] font-mono-code text-[#3ECF8E]">{res.row_count || 0} row(s) · {res.execution_time_ms?.toFixed(2) || '0.00'} ms</span>
                  </div>
                  <div className="bg-[#0E1116] border border-[#2A303C] rounded overflow-x-auto max-h-80">
                    <table className="w-full text-[10px] font-mono-code">
                      <thead>
                        <tr className="border-b border-[#2A303C]">
                          {res.columns.map((col: string, i: number) => (
                            <th key={i} className="px-3 py-2 text-left text-[#4FD1C5] font-bold uppercase tracking-wider bg-[#161A22]">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {res.rows.length === 0 ? (
                          <tr>
                            <td colSpan={res.columns.length} className="px-3 py-4 text-center text-slate-500 italic">
                              No rows returned.
                            </td>
                          </tr>
                        ) : (
                          res.rows.map((row: any, i: number) => (
                            <tr key={i} className="border-b border-[#2A303C]/50 hover:bg-[#161A22]/50">
                              {res.columns.map((col: string, j: number) => (
                                <td key={j} className="px-3 py-2 text-[#F3F1EA]">
                                  {row[col] === null ? <span className="text-slate-600 italic">null</span> : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Safety status */}
                {res?.is_safe !== undefined && (
                  <div className={`flex items-center gap-2 text-[10px] font-mono-code px-3 py-2 rounded border ${res.is_safe ? 'bg-[#3ECF8E]/5 border-[#3ECF8E]/30 text-[#3ECF8E]' : 'bg-[#EC5F5B]/5 border-[#EC5F5B]/30 text-[#EC5F5B]'}`}>
                    <span className="font-bold">{res.is_safe ? '✓' : '⚠'}</span>
                    <span>{res.is_safe ? 'Safe SELECT query executed on SQLite database.' : 'Query blocked by safety guardrails.'}</span>
                  </div>
                )}
              </>
            )}

            {/* SQL-only mode status */}
            {queryMode === 'generate' && (
              <div className="flex items-center gap-2 text-[10px] font-mono-code px-3 py-2 rounded border bg-[#4FD1C5]/5 border-[#4FD1C5]/30 text-[#4FD1C5]">
                <span className="font-bold">ℹ</span>
                <span>SQL generated successfully. Switch to "SQL + Run" mode to execute queries.</span>
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
