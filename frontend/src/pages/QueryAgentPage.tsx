import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  testConnection,
  saveConnection,
  ingestSchema,
  generateAndRun,
  getActiveConnection,
  getRAGStatus,
  type ConnectionTestResponse,
  type ConnectionSaveResponse,
  type GenerateAndRunResponse,
} from '../services/api';

// ─── Demo / Mock Database URL Presets ────────────────────────────────────────
// Click any preset to auto-fill the connection URL for quick testing/demos

const DEMO_URLS = [
  {
    label: 'Supabase (Pooler)',
    icon: '⚡',
    color: '#3ECF8E',
    url: 'postgresql://postgres.okqopmcjiqoyrhbigsvo:Jaiyanth%402005@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    hint: 'Supabase — Mumbai pooler · pgbouncer mode',
  },
  {
    label: 'Neon PostgreSQL',
    icon: '🌿',
    color: '#4FD1C5',
    url: 'postgresql://neondb_owner:npg_jX8YElxJt0ki@ep-shy-math-ad8u4nao-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
    hint: 'Neon — US East · serverless PostgreSQL',
  },
  {
    label: 'Local PostgreSQL',
    icon: '🖥',
    color: '#8B7CF6',
    url: 'postgresql://postgres:postgres@localhost:5432/postgres',
    hint: 'Local · standard PostgreSQL instance',
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────

type FlowStep =
  | 'connect'      // waiting to test connection
  | 'tested'       // connection tested successfully
  | 'saved'        // connection saved (active)
  | 'indexed'      // schema indexed in Qdrant
  | 'ready';       // all set — user can ask questions

type Status = 'idle' | 'loading' | 'success' | 'error';

interface StepStatus {
  test: Status;
  save: Status;
  ingest: Status;
  query: Status;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const QueryAgentPage: React.FC = () => {
  const questionRef = useRef<HTMLTextAreaElement>(null);

  // ── Flow state ────────────────────────────────────────
  const [flowStep, setFlowStep] = useState<FlowStep>('connect');
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    test: 'idle',
    save: 'idle',
    ingest: 'idle',
    query: 'idle',
  });

  // ── Form state ────────────────────────────────────────
  const [connectionUrl, setConnectionUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [question, setQuestion] = useState('');

  // ── Result state ──────────────────────────────────────
  const [testResult, setTestResult] = useState<ConnectionTestResponse | null>(null);
  const [saveResult, setSaveResult] = useState<ConnectionSaveResponse | null>(null);
  const [ingestResult, setIngestResult] = useState<{ indexed_tables: number } | null>(null);
  const [queryResult, setQueryResult] = useState<GenerateAndRunResponse | null>(null);

  // ── Error messages ────────────────────────────────────
  const [errors, setErrors] = useState<Partial<Record<keyof StepStatus, string>>>({});

  // ── Ingest steps animation ────────────────────────────
  const [ingestStep, setIngestStep] = useState(0);

  // ── Pipeline loading steps animation ─────────────────
  const [queryStep, setQueryStep] = useState(0);

  // ── Check existing connection on mount ────────────────
  useEffect(() => {
    (async () => {
      try {
        const conn = await getActiveConnection();
        if (conn.connected) {
          setSaveResult({
            saved: true,
            connection_id: conn.connection_id,
            database_type: conn.database_type,
            masked_url: conn.masked_url,
            host: conn.host,
            database_name: conn.database_name,
          });
          setStepStatus(s => ({ ...s, test: 'success', save: 'success' }));
          setFlowStep('saved');

          const rag = await getRAGStatus();
          if (rag.indexed) {
            setIngestResult({ indexed_tables: rag.indexed_tables });
            setStepStatus(s => ({ ...s, ingest: 'success' }));
            setFlowStep('indexed');
          }
        }
      } catch {
        // No active connection — stay in 'connect' state
      }
    })();
  }, []);

  // ── Ingest animation ──────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (stepStatus.ingest === 'loading') {
      setIngestStep(0);
      timer = setInterval(() => {
        setIngestStep(prev => (prev < 5 ? prev + 1 : prev));
      }, 1100);
    }
    return () => clearInterval(timer);
  }, [stepStatus.ingest]);

  // ── Query pipeline animation ──────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (stepStatus.query === 'loading') {
      setQueryStep(0);
      timer = setInterval(() => {
        setQueryStep(prev => (prev < 5 ? prev + 1 : prev));
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [stepStatus.query]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleTestConnection = async () => {
    if (!connectionUrl.trim()) return;
    setStepStatus(s => ({ ...s, test: 'loading' }));
    setErrors(e => ({ ...e, test: undefined }));
    setTestResult(null);
    try {
      const res = await testConnection(connectionUrl.trim());
      if (!res.connected) throw new Error(res.message || 'Connection test failed');
      setTestResult(res);
      setStepStatus(s => ({ ...s, test: 'success' }));
      setFlowStep('tested');
    } catch (err: any) {
      setStepStatus(s => ({ ...s, test: 'error' }));
      setErrors(e => ({
        ...e,
        test: err.message || 'Database connection failed. Please check your PostgreSQL connection URL.',
      }));
    }
  };

  const handleSaveConnection = async () => {
    if (!connectionUrl.trim()) return;
    setStepStatus(s => ({ ...s, save: 'loading' }));
    setErrors(e => ({ ...e, save: undefined }));
    try {
      const res = await saveConnection(connectionUrl.trim());
      setSaveResult(res);
      setStepStatus(s => ({ ...s, save: 'success' }));
      setFlowStep('saved');
    } catch (err: any) {
      setStepStatus(s => ({ ...s, save: 'error' }));
      setErrors(e => ({
        ...e,
        save: err.message || 'Failed to save connection. Please try again.',
      }));
    }
  };

  const handleIngestSchema = async () => {
    setStepStatus(s => ({ ...s, ingest: 'loading' }));
    setErrors(e => ({ ...e, ingest: undefined }));
    setIngestResult(null);
    try {
      const res = await ingestSchema();
      setIngestResult({ indexed_tables: res.indexed_tables ?? res.tables_indexed ?? 0 });
      setStepStatus(s => ({ ...s, ingest: 'success' }));
      setFlowStep('indexed');
    } catch (err: any) {
      setStepStatus(s => ({ ...s, ingest: 'error' }));
      setErrors(e => ({
        ...e,
        ingest: err.message || 'Schema indexing failed. Please check your connection and try again.',
      }));
    }
  };

  const handleGenerateAndRun = async () => {
    if (!question.trim()) return;

    if (flowStep !== 'indexed') {
      setErrors(e => ({
        ...e,
        query: 'Please connect a database and index schema first.',
      }));
      return;
    }

    setStepStatus(s => ({ ...s, query: 'loading' }));
    setErrors(e => ({ ...e, query: undefined }));
    setQueryResult(null);

    try {
      const res = await generateAndRun(question.trim());
      setQueryResult(res);
      setStepStatus(s => ({ ...s, query: 'success' }));
    } catch (err: any) {
      setStepStatus(s => ({ ...s, query: 'error' }));
      setErrors(e => ({
        ...e,
        query: err.message || 'Query generation or execution failed.',
      }));
    }
  };

  const handleNewQuery = () => {
    setQuestion('');
    setQueryResult(null);
    setStepStatus(s => ({ ...s, query: 'idle' }));
    setErrors(e => ({ ...e, query: undefined }));
    questionRef.current?.focus();
  };

  const handleEditConnection = () => {
    setConnectionUrl('');
    setTestResult(null);
    setSaveResult(null);
    setIngestResult(null);
    setQueryResult(null);
    setFlowStep('connect');
    setStepStatus({ test: 'idle', save: 'idle', ingest: 'idle', query: 'idle' });
    setErrors({});
  };

  const handleCopySQL = () => {
    const sql = queryResult?.generated_sql || queryResult?.sql || '';
    if (sql) navigator.clipboard.writeText(sql);
  };

  // ─── Syntax highlighting ────────────────────────────────────────────────

  const renderSQL = (sql: string) => {
    if (!sql) return <span className="text-slate-500">-- No SQL generated</span>;
    const keywords = new Set([
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
      'LIMIT', 'ORDER', 'BY', 'DESC', 'ASC', 'GROUP', 'HAVING',
      'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'ON',
      'AS', 'WITH', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'BETWEEN', 'LIKE',
    ]);
    return sql.split(/(\s+|\b)/).map((part, i) => {
      const up = part.trim().toUpperCase();
      if (keywords.has(up)) return <span key={i} className="text-[#8B7CF6] font-bold">{part}</span>;
      if (/^\d+$/.test(part.trim())) return <span key={i} className="text-[#F5B942]">{part}</span>;
      if (/^'[^']*'$/.test(part.trim())) return <span key={i} className="text-[#3ECF8E]">{part}</span>;
      return <span key={i} className="text-[#F3F1EA]">{part}</span>;
    });
  };

  // ─── Step indicator ─────────────────────────────────────────────────────

  const stepDot = (s: Status) => {
    if (s === 'success') return <span className="w-2 h-2 rounded-full bg-[#3ECF8E] inline-block" />;
    if (s === 'error')   return <span className="w-2 h-2 rounded-full bg-[#EC5F5B] inline-block" />;
    if (s === 'loading') return <span className="w-2 h-2 rounded-full bg-[#F5B942] animate-pulse inline-block" />;
    return <span className="w-2 h-2 rounded-full bg-[#2A303C] inline-block" />;
  };

  const ingestStepLabels = [
    'Establishing database connection handle',
    'Introspecting schema tables & columns',
    'Filtering platform-internal tables',
    'Generating embeddings via fastembed',
    'Uploading schema vectors to Qdrant Cloud',
    'Schema indexing complete ✓',
  ];

  const queryStepLabels = [
    'Embedding question with BAAI/bge-small-en-v1.5',
    'Retrieving relevant schema context from Qdrant',
    'Injecting schema context into LLM compiler',
    'Running SQL guardrail validations',
    'Connecting to target database securely',
    'Executing safe SELECT query',
  ];

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6 text-left">

        {/* ── Page Header ────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-3xl font-bold font-display text-[#F3F1EA] tracking-tight">
              Query Agent
            </h2>
            <span className="text-[10px] font-mono-code bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 text-[#3ECF8E] px-2 py-0.5 rounded font-bold">
              Full Flow
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans-ui">
            Connect your PostgreSQL database, sync the schema into Qdrant, then ask natural language questions to generate and execute SQL.
          </p>
        </div>

        {/* ── Progress Breadcrumb ─────────────────────────── */}
        <div className="flex items-center gap-2 text-[10px] font-mono-code text-slate-500 flex-wrap">
          {[
            { label: 'Connect', step: 'connect' as FlowStep, status: stepStatus.test },
            { label: 'Save', step: 'tested' as FlowStep, status: stepStatus.save },
            { label: 'Index Schema', step: 'saved' as FlowStep, status: stepStatus.ingest },
            { label: 'Ask & Execute', step: 'indexed' as FlowStep, status: stepStatus.query },
          ].map((item, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-1.5">
                {stepDot(item.status)}
                <span className={item.status === 'success' ? 'text-[#3ECF8E] font-bold' : 'text-slate-500'}>
                  {item.label}
                </span>
              </div>
              {idx < 3 && <span className="text-slate-700">→</span>}
            </React.Fragment>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════
            STEP 1: DATABASE CONNECTION
        ═══════════════════════════════════════════════════ */}
        <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-6 shadow-md flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono-code font-bold text-[#4FD1C5] bg-[#4FD1C5]/10 border border-[#4FD1C5]/20 px-2 py-0.5 rounded">Step 1</span>
                <h3 className="text-sm font-bold text-[#F3F1EA]">Connect Database</h3>
              </div>
              <p className="text-[11px] text-slate-500 font-sans-ui leading-relaxed max-w-xl">
                Enter your PostgreSQL connection URL. Credentials are tested with SELECT&nbsp;1, then encrypted and stored backend-only.
              </p>
            </div>
            {stepStatus.save === 'success' && saveResult && (
              <div className="text-[10px] font-mono-code text-[#3ECF8E] font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
                {saveResult.masked_url}
              </div>
            )}
          </div>

          {/* URL Input */}
          {stepStatus.save !== 'success' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-500 font-bold uppercase text-[9px] tracking-wider font-sans-ui">
                    PostgreSQL Connection URL
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowUrl(!showUrl)}
                    className="text-[10px] text-[#4FD1C5] font-sans-ui font-semibold hover:underline"
                  >
                    {showUrl ? 'Hide' : 'Show'} URL
                  </button>
                </div>
                <input
                  type={showUrl ? 'text' : 'password'}
                  value={connectionUrl}
                  onChange={e => {
                    setConnectionUrl(e.target.value);
                    setStepStatus(s => ({ ...s, test: 'idle' }));
                    setTestResult(null);
                  }}
                  placeholder="postgresql://username:password@host:6543/postgres"
                  className="w-full px-3 py-2.5 bg-[#0E1116] border border-[#2A303C] focus:border-[#4FD1C5] focus:ring-1 focus:ring-[#4FD1C5] rounded font-mono text-xs text-[#F3F1EA] outline-none transition-colors"
                  disabled={stepStatus.test === 'loading' || stepStatus.save === 'loading'}
                  onKeyDown={e => { if (e.key === 'Enter') handleTestConnection(); }}
                />
                <span className="text-[9px] text-slate-600 font-sans-ui">
                  Supports: postgresql://, postgres://, postgresql+psycopg2://
                </span>
              </div>

              {/* ── Demo / Mock URL Presets ───────────────────────────── */}
              <div className="flex flex-col gap-2">
                <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider font-sans-ui">
                  Quick Fill — Demo &amp; Test Databases
                </span>
                <div className="flex flex-wrap gap-2">
                  {DEMO_URLS.map((demo, idx) => {
                    const isActive = connectionUrl === demo.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setConnectionUrl(demo.url);
                          setShowUrl(false);
                          setTestResult(null);
                          setStepStatus(s => ({ ...s, test: 'idle' }));
                          setErrors(e => ({ ...e, test: undefined }));
                        }}
                        title={demo.hint}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-mono-code font-bold transition-all ${
                          isActive
                            ? 'border-current text-current shadow-[0_0_8px_currentColor] opacity-100'
                            : 'border-[#2A303C] text-slate-400 hover:border-[#2A303C] hover:text-[#F3F1EA] hover:bg-[#1A1F29] opacity-80 hover:opacity-100'
                        }`}
                        style={isActive ? { color: demo.color, borderColor: demo.color } : {}}
                      >
                        <span>{demo.icon}</span>
                        <span>{demo.label}</span>
                        {isActive && (
                          <span
                            className="ml-1 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                            style={{ background: `${demo.color}20`, color: demo.color }}
                          >
                            loaded
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[9px] text-slate-600 font-sans-ui">
                  * Click a preset to auto-fill. You can also paste your own URL above.
                </span>
              </div>

              {/* Error message for connection */}
              {errors.test && (
                <div className="flex items-start gap-2 bg-red-950/30 border border-red-800/60 rounded px-3 py-2 text-[11px] font-mono-code text-red-400">
                  <span className="text-[#EC5F5B] mt-0.5 shrink-0">⚠</span>
                  <span>{errors.test}</span>
                </div>
              )}
              {errors.save && (
                <div className="flex items-start gap-2 bg-red-950/30 border border-red-800/60 rounded px-3 py-2 text-[11px] font-mono-code text-red-400">
                  <span className="text-[#EC5F5B] mt-0.5 shrink-0">⚠</span>
                  <span>{errors.save}</span>
                </div>
              )}

              {/* Test success info */}
              {testResult && stepStatus.test === 'success' && (
                <div className="flex items-center gap-2 bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 rounded px-3 py-2 text-[11px] font-mono-code text-[#3ECF8E]">
                  <span>✓</span>
                  <span>
                    Connected to <strong>{testResult.database_type?.toUpperCase()}</strong> at <strong>{testResult.host}</strong> — database: <strong>{testResult.database_name}</strong>
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 justify-end pt-1 font-sans-ui">
                {connectionUrl && (
                  <button
                    onClick={() => { setConnectionUrl(''); setTestResult(null); setStepStatus(s => ({ ...s, test: 'idle' })); setErrors(e => ({ ...e, test: undefined })); }}
                    className="px-4 py-2 border border-[#2A303C] hover:bg-[#1A1F29] rounded text-xs font-semibold text-slate-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  id="btn-test-connection"
                  onClick={handleTestConnection}
                  disabled={!connectionUrl.trim() || stepStatus.test === 'loading'}
                  className="px-5 py-2 bg-[#4FD1C5] hover:bg-[#4FD1C5]/90 text-[#0E1116] rounded text-xs font-bold shadow-[0_0_12px_rgba(79,209,197,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {stepStatus.test === 'loading' ? 'Testing...' : 'Test Connection'}
                </button>
                {stepStatus.test === 'success' && (
                  <button
                    id="btn-save-connection"
                    onClick={handleSaveConnection}
                    disabled={stepStatus.save === 'loading'}
                    className="px-5 py-2 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#0E1116] rounded text-xs font-bold shadow-[0_0_12px_rgba(62,207,142,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {stepStatus.save === 'loading' ? 'Saving...' : 'Save Connection'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Already saved — show summary + edit link */
            <div className="flex items-center justify-between flex-wrap gap-4 border-t border-[#2A303C]/40 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] font-mono-code text-slate-400">
                <div>
                  <span className="text-slate-600 block text-[9px] uppercase tracking-wider mb-0.5">Status</span>
                  <span className="font-bold text-[#3ECF8E]">CONNECTED</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[9px] uppercase tracking-wider mb-0.5">Type</span>
                  <span className="font-bold text-[#F3F1EA] uppercase">{saveResult?.database_type}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[9px] uppercase tracking-wider mb-0.5">Host</span>
                  <span className="font-bold text-[#F3F1EA]">{saveResult?.host}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[9px] uppercase tracking-wider mb-0.5">Database</span>
                  <span className="font-bold text-[#F3F1EA]">{saveResult?.database_name}</span>
                </div>
              </div>
              <button
                onClick={handleEditConnection}
                className="px-4 py-2 border border-[#2A303C] hover:bg-[#1A1F29] rounded text-xs font-semibold text-slate-400 font-sans-ui transition-colors"
              >
                Change Connection
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
            STEP 2: INDEX SCHEMA
        ═══════════════════════════════════════════════════ */}
        <div className={`bg-[#161A22] border rounded-[10px] p-6 shadow-md flex flex-col gap-4 transition-all ${
          stepStatus.save !== 'success' ? 'border-[#2A303C] opacity-50 pointer-events-none' : 'border-[#2A303C]'
        }`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono-code font-bold text-[#8B7CF6] bg-[#8B7CF6]/10 border border-[#8B7CF6]/20 px-2 py-0.5 rounded">Step 2</span>
                <h3 className="text-sm font-bold text-[#F3F1EA]">Extract & Index Schema</h3>
              </div>
              <p className="text-[11px] text-slate-500 font-sans-ui leading-relaxed max-w-xl">
                Introspect your database schema using SQLAlchemy, generate embeddings with fastembed (BAAI/bge-small-en-v1.5), and store them in Qdrant Cloud for RAG-grounded SQL generation.
              </p>
            </div>
            {stepStatus.ingest === 'success' && ingestResult && (
              <div className="text-[10px] font-mono-code text-[#3ECF8E] font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E]" />
                {ingestResult.indexed_tables} tables indexed
              </div>
            )}
          </div>

          {/* Error */}
          {errors.ingest && (
            <div className="flex items-start gap-2 bg-red-950/30 border border-red-800/60 rounded px-3 py-2 text-[11px] font-mono-code text-red-400">
              <span className="text-[#EC5F5B] mt-0.5 shrink-0">⚠</span>
              <span>{errors.ingest}</span>
            </div>
          )}

          {/* Ingest pipeline loader */}
          {stepStatus.ingest === 'loading' && (
            <div className="border border-[#2A303C]/40 rounded bg-[#0E1116] p-4 font-mono-code text-[10px] space-y-1.5 text-slate-400">
              <span className="text-slate-500 block font-sans-ui font-semibold text-[9px] uppercase tracking-wider mb-2">
                Ingestion Pipeline
              </span>
              {ingestStepLabels.map((label, idx) => {
                const done = idx < ingestStep;
                const running = idx === ingestStep;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className={done ? 'text-[#3ECF8E]' : running ? 'text-[#4FD1C5] animate-pulse' : 'text-slate-600'}>
                      {done ? '[✓]' : running ? '[⏳]' : '[·]'}
                    </span>
                    <span className={done ? 'text-[#F3F1EA]' : running ? 'text-[#4FD1C5]' : 'text-slate-600'}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Success info */}
          {stepStatus.ingest === 'success' && ingestResult && (
            <div className="flex items-center gap-2 bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 rounded px-3 py-2 text-[11px] font-mono-code text-[#3ECF8E]">
              <span>✓</span>
              <span>Schema indexed successfully. <strong>{ingestResult.indexed_tables}</strong> table(s) stored in Qdrant Cloud. RAG is ready.</span>
            </div>
          )}

          <div className="flex justify-end pt-1 font-sans-ui">
            <button
              id="btn-ingest-schema"
              onClick={handleIngestSchema}
              disabled={stepStatus.save !== 'success' || stepStatus.ingest === 'loading'}
              className="px-5 py-2 bg-[#8B7CF6] hover:bg-[#8B7CF6]/90 text-white rounded text-xs font-bold shadow-[0_0_12px_rgba(139,124,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stepStatus.ingest === 'loading'
                ? 'Extracting & Indexing...'
                : stepStatus.ingest === 'success'
                ? 'Re-Sync Schema'
                : 'Extract & Index Schema'}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            STEP 3: ASK QUESTION
        ═══════════════════════════════════════════════════ */}
        <div className={`bg-[#161A22] border rounded-[10px] p-6 shadow-md flex flex-col gap-4 transition-all ${
          stepStatus.ingest !== 'success' ? 'border-[#2A303C] opacity-50 pointer-events-none' : 'border-[#2A303C]'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono-code font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 px-2 py-0.5 rounded">Step 3</span>
              <h3 className="text-sm font-bold text-[#F3F1EA]">Ask a Question</h3>
            </div>
            <p className="text-[11px] text-slate-500 font-sans-ui leading-relaxed">
              Ask in plain English. The system retrieves your schema context from Qdrant, generates SQL using Groq/Gemini LLM, validates it through guardrails, and executes it safely.
            </p>
          </div>

          {/* Question input */}
          <div className="relative bg-[#0E1116] border border-[#2A303C] focus-within:border-[#4FD1C5] focus-within:ring-1 focus-within:ring-[#4FD1C5] rounded p-3 flex gap-2 items-start transition-colors">
            <span className="font-mono text-[#8B7CF6] select-none mt-1.5 text-xs shrink-0">$ ask:</span>
            <textarea
              ref={questionRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. Show top 10 customers by total orders"
              className="w-full bg-transparent border-none outline-none text-xs text-[#F3F1EA] font-mono h-16 mt-1 resize-none"
              disabled={stepStatus.query === 'loading'}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerateAndRun(); }}
            />
          </div>

          {/* Error */}
          {errors.query && !queryResult && (
            <div className="flex items-start gap-2 bg-red-950/30 border border-red-800/60 rounded px-3 py-2 text-[11px] font-mono-code text-red-400">
              <span className="text-[#EC5F5B] mt-0.5 shrink-0">⚠</span>
              <span>{errors.query}</span>
            </div>
          )}

          {/* Query pipeline loader */}
          {stepStatus.query === 'loading' && (
            <div className="border border-[#2A303C]/40 rounded bg-[#0E1116] p-4 font-mono-code text-[10px] space-y-1.5 text-slate-400">
              <span className="text-slate-500 block font-sans-ui font-semibold text-[9px] uppercase tracking-wider mb-2">
                Agent Execution Pipeline
              </span>
              {queryStepLabels.map((label, idx) => {
                const done = idx < queryStep;
                const running = idx === queryStep;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className={done ? 'text-[#3ECF8E]' : running ? 'text-[#4FD1C5] animate-pulse' : 'text-slate-600'}>
                      {done ? '[✓]' : running ? '[⏳]' : '[·]'}
                    </span>
                    <span className={done ? 'text-[#F3F1EA]' : running ? 'text-[#4FD1C5]' : 'text-slate-600'}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-[#2A303C]/40 font-sans-ui flex-wrap gap-2">
            <span className="text-[10px] text-slate-600 font-mono-code">
              Ctrl+Enter to run · Only safe SELECT queries are executed
            </span>
            <button
              id="btn-generate-run"
              onClick={handleGenerateAndRun}
              disabled={!question.trim() || stepStatus.query === 'loading' || stepStatus.ingest !== 'success'}
              className="px-6 py-2.5 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#0E1116] rounded text-xs font-bold shadow-[0_0_12px_rgba(62,207,142,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stepStatus.query === 'loading' ? 'Generating & Executing...' : '▶  Generate & Run Query'}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            STEP 4: RESULTS
        ═══════════════════════════════════════════════════ */}
        {queryResult && (
          <div className="flex flex-col gap-4">

            {/* Status bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 bg-[#161A22] border border-[#2A303C] rounded px-4 py-2.5 text-[10px] font-mono-code">
              <div className="flex items-center gap-4 flex-wrap">
                <span className={`font-bold ${queryResult.safety_status === 'safe' ? 'text-[#3ECF8E]' : 'text-[#EC5F5B]'}`}>
                  {queryResult.safety_status === 'safe' ? '✓ SAFE' : '✗ BLOCKED'}
                </span>
                {queryResult.safety_status === 'safe' && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">
                      <span className="text-[#4FD1C5] font-bold">{queryResult.row_count}</span> rows returned
                    </span>
                    {queryResult.execution_time_ms != null && (
                      <>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-400">
                          executed in <span className="text-[#F5B942] font-bold">{queryResult.execution_time_ms} ms</span>
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
              <button
                onClick={handleNewQuery}
                className="px-3 py-1 bg-[#0E1116] border border-[#2A303C] hover:border-[#4FD1C5] text-slate-400 hover:text-[#F3F1EA] rounded text-[10px] font-sans-ui font-semibold transition-all"
              >
                + New Query
              </button>
            </div>

            {/* Blocked message */}
            {queryResult.safety_status !== 'safe' && (
              <div className="bg-red-950/30 border border-red-800/60 rounded px-4 py-3 text-[11px] font-mono-code text-red-400 flex items-start gap-2">
                <span className="text-[#EC5F5B] shrink-0 mt-0.5">⚠</span>
                <span>Unsafe SQL query blocked. Reason: {queryResult.explanation}</span>
              </div>
            )}

            {/* Generated SQL */}
            <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A303C] bg-[#1A1F29]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EC5F5B]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
                  <span className="ml-2 font-mono-code text-[10px] text-slate-500">generated_query.sql</span>
                </div>
                <button
                  id="btn-copy-sql"
                  onClick={handleCopySQL}
                  className="px-3 py-1 bg-[#0E1116] border border-[#2A303C] hover:border-[#8B7CF6] text-slate-400 hover:text-[#8B7CF6] rounded text-[10px] font-sans-ui font-semibold transition-all"
                >
                  Copy SQL
                </button>
              </div>
              <pre className="p-5 font-mono text-xs leading-relaxed overflow-x-auto">
                <code>{renderSQL(queryResult.generated_sql || queryResult.sql || '')}</code>
              </pre>
              {queryResult.explanation && (
                <div className="px-5 pb-5 pt-0">
                  <div className="bg-[#0E1116] border border-[#2A303C] rounded p-3">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-sans-ui font-semibold block mb-1">Explanation</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans-ui">
                      {queryResult.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Result Table */}
            {queryResult.safety_status === 'safe' && (
              <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2A303C] bg-[#1A1F29] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EC5F5B]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
                    <span className="ml-2 font-mono-code text-[10px] text-slate-500">query_result.json</span>
                  </div>
                  <span className="font-mono-code text-[10px] text-slate-500">
                    <span className="text-[#4FD1C5] font-bold">{queryResult.row_count}</span> row{queryResult.row_count !== 1 ? 's' : ''}
                  </span>
                </div>

                {queryResult.row_count === 0 || queryResult.rows.length === 0 ? (
                  <div className="p-8 text-center font-mono-code text-xs text-slate-500">
                    No rows found. The query executed successfully but returned 0 records.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#2A303C] font-mono-code text-xs">
                      <thead className="bg-[#0E1116]">
                        <tr>
                          {queryResult.columns.map((col, idx) => (
                            <th
                              key={idx}
                              className="px-4 py-2.5 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-[#2A303C] last:border-r-0 text-[10px]"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2A303C]">
                        {queryResult.rows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-[#0E1116]/80 transition-colors">
                            {queryResult.columns.map((col, colIdx) => {
                              const cell = (row as Record<string, unknown>)[col];
                              return (
                                <td
                                  key={colIdx}
                                  className="px-4 py-2 whitespace-nowrap text-[#F3F1EA] border-r border-[#2A303C] last:border-r-0"
                                >
                                  {cell !== null && cell !== undefined ? String(cell) : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* RAG Context accordion */}
            {queryResult.schema_context && queryResult.schema_context.length > 0 && (
              <details className="bg-[#161A22] border border-[#2A303C] rounded-[10px] overflow-hidden group">
                <summary className="px-4 py-3 flex items-center gap-2 cursor-pointer font-mono-code text-[10px] text-slate-500 hover:text-[#4FD1C5] select-none list-none">
                  <span className="text-[#4FD1C5] transition-transform group-open:rotate-90">▶</span>
                  RAG Schema Context Retrieved ({queryResult.schema_context.length} chunks)
                </summary>
                <div className="border-t border-[#2A303C] p-4 space-y-3">
                  {queryResult.schema_context.map((ctx, idx) => (
                    <div key={idx} className="bg-[#0E1116] border border-[#2A303C] rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono-code text-[10px] text-[#4FD1C5] bg-[#4FD1C5]/10 border border-[#4FD1C5]/20 px-2 py-0.5 rounded">
                          {ctx.table_name}
                        </span>
                        <span className="font-mono-code text-[9px] text-slate-500">
                          relevance: {(ctx.relevance_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <pre className="text-[10px] text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">{ctx.content}</pre>
                    </div>
                  ))}
                </div>
              </details>
            )}

          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
