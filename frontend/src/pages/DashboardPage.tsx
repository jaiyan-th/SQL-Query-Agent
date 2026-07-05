import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { OutputTabs } from '../components/OutputTabs';

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
  },
  generateQuery: async (question: string) => {
    const res = await fetch(`${API_BASE}/api/generate-query`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ question })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Query generation failed');
    }
    return res.json();
  },
  generateAndRun: async (question: string) => {
    const res = await fetch(`${API_BASE}/api/generate-and-run`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ question })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Query execution failed');
    }
    return res.json();
  },
  getHistory: async () => {
    const res = await fetch(`${API_BASE}/api/history`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    if (!res.ok) throw new Error('Failed to load history');
    return res.json();
  },
  getSuggestions: async () => {
    const res = await fetch(`${API_BASE}/api/suggestions`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    if (!res.ok) throw new Error('Failed to load suggestions');
    return res.json();
  }
};

export const DashboardPage: React.FC = () => {
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [schemaIndexed, setSchemaIndexed] = useState(false);
  const [dbUrl, setDbUrl] = useState('');
  const [tablesIndexed, setTablesIndexed] = useState(0);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'generate' | 'execute'>('generate');
  const [queryResponse, setQueryResponse] = useState<any>(null);
  const [error, setError] = useState('');

  // Mobile responsive sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Pipeline loader steps state
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    api.checkHealth()
      .then((data) => {
        if (data.database && data.database.configured) {
          setDatabaseConnected(true);
        }
        if (data.qdrant && data.qdrant.indexed) {
          setSchemaIndexed(true);
          setTablesIndexed(data.qdrant.document_count || 0);
        }
      })
      .catch(() => {});

    loadHistory();
    loadSuggestions();
  }, []);

  // Cycle loading step intervals while query is fetching
  useEffect(() => {
    let timer: any;
    if (queryLoading) {
      setLoadingStep(0);
      timer = setInterval(() => {
        setLoadingStep((prev) => {
          const maxSteps = mode === 'execute' ? 4 : 3;
          return prev < maxSteps ? prev + 1 : prev;
        });
      }, 1400);
    } else {
      setLoadingStep(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [queryLoading, mode]);

  const handleTestConnection = async () => {
    if (!dbUrl.trim()) return;
    try {
      setConnectionLoading(true);
      setError('');
      const res = await api.testConnection(dbUrl);
      setDatabaseConnected(res.connected);
    } catch (err: any) {
      setError(err.message || 'Connection failed');
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
      setSchemaIndexed(true);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      loadSuggestions();
    } catch (err: any) {
      setError(err.message || 'Ingestion failed');
    } finally {
      setIngestLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await api.getHistory();
      setHistory(result.history || []);
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      const result = await api.getSuggestions();
      setSuggestions(result.suggestions || []);
    } catch (err) {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!question.trim() || queryLoading) return;
    try {
      setQueryLoading(true);
      setError('');
      setQueryResponse(null);

      const result = mode === 'generate'
        ? await api.generateQuery(question.trim())
        : await api.generateAndRun(question.trim());

      setQueryResponse(result);
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'Query execution failed');
    } finally {
      setQueryLoading(false);
    }
  };

  const handleFormatChipClick = (formatLabel: string) => {
    // Remove existing suffix matches to avoid duplication
    let cleanQuestion = question
      .replace(/\s+as\s+(table|bar\s+chart|bar\s+graph|pie\s+chart|report|analysis)$/i, '')
      .replace(/\s+in\s+text$/i, '')
      .replace(/\s+with\s+analysis$/i, '')
      .trim();

    if (formatLabel === 'Table') {
      setQuestion(cleanQuestion + " as table");
    } else if (formatLabel === 'Bar Chart') {
      setQuestion(cleanQuestion + " as bar chart");
      setMode('execute');
    } else if (formatLabel === 'Pie Chart') {
      setQuestion(cleanQuestion + " as pie chart");
      setMode('execute');
    } else if (formatLabel === 'Text') {
      setQuestion(cleanQuestion + " in text");
      setMode('execute');
    } else if (formatLabel === 'Report') {
      setQuestion(cleanQuestion + " as report");
      setMode('execute');
    } else if (formatLabel === 'Analysis') {
      setQuestion(cleanQuestion + " with analysis");
      setMode('execute');
    } else if (formatLabel === 'Auto') {
      setQuestion(cleanQuestion);
    }
  };

  const handleSuggestionClick = (s: any) => {
    setQuestion(s.question);
    if (s.output_format && s.output_format !== 'table' && s.output_format !== 'auto' && s.output_format !== 'sql') {
      setMode('execute');
    }
  };

  const totalQueries = history.length;
  const safeExecutions = history.filter(item => item.status === 'success').length;
  const safeRate = totalQueries > 0 ? ((safeExecutions / totalQueries) * 100).toFixed(0) : '0';
  const hasText = question.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#0E1116] text-[#F3F1EA] flex flex-col font-sans-ui select-none">
      <Navbar />

      {/* Mobile Sidebar Toggle Header */}
      <div className="md:hidden bg-[#161A22] border-b border-[#2A303C] px-4 py-2 flex items-center justify-between font-mono-code text-[11px]">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="px-2 py-1 bg-[#0E1116] border border-[#2A303C] rounded text-slate-300"
        >
          {sidebarOpen ? '[ Close Menu ]' : '[ Open Menu ]'}
        </button>
        <span className="text-slate-500 font-bold">QueryGen AI</span>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Responsive Sidebar Overlay */}
        <div className={`${sidebarOpen ? 'block absolute inset-y-0 left-0 z-30' : 'hidden'} md:block`}>
          <Sidebar
            dbUrl={dbUrl}
            setDbUrl={setDbUrl}
            connectionLoading={connectionLoading}
            databaseConnected={databaseConnected}
            handleTestConnection={handleTestConnection}
            schemaIndexed={schemaIndexed}
            tablesIndexed={tablesIndexed}
            history={history}
            historyLoading={historyLoading}
            loadHistory={loadHistory}
            setQuestion={(q) => { setQuestion(q); setSidebarOpen(false); }}
          />
        </div>

        {/* Dashboard Workspace */}
        <main className="flex-grow p-6 overflow-y-auto flex flex-col gap-6" style={{ maxHeight: 'calc(100vh - 70px)' }}>
          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-400 px-4 py-3 rounded flex items-start gap-2 text-xs font-mono-code font-bold">
              <span className="text-[#EC5F5B] mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Tier 2: Slim Horizontal Status Strip */}
          <div className="bg-[#161A22] border border-[#2A303C] rounded px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-[10px] text-slate-400 font-sans-ui">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
                API online
              </span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${databaseConnected ? 'bg-[#3ECF8E] animate-pulse' : 'bg-slate-600'}`} />
                Postgres {databaseConnected ? 'connected' : 'offline'}
              </span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${schemaIndexed ? 'bg-[#4FD1C5] animate-pulse' : 'bg-slate-600'}`} />
                Qdrant {tablesIndexed} tables indexed {lastSynced ? `(${lastSynced})` : ''}
              </span>
              {databaseConnected && (
                <button
                  onClick={handleIngestSchema}
                  disabled={ingestLoading}
                  className="px-1.5 py-0.5 bg-[#4FD1C5]/10 border border-[#4FD1C5]/30 text-[#4FD1C5] hover:bg-[#4FD1C5]/20 rounded font-bold transition-all font-mono-code"
                >
                  {ingestLoading ? 'Syncing...' : 'Sync Schema'}
                </button>
              )}
            </div>
            
            {/* Big number, small caption rhythm */}
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold font-display text-[#F3F1EA] leading-none">{totalQueries}</span>
                <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">queries</span>
              </div>
              <div className="h-6 w-px bg-[#2A303C]" />
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold font-display text-[#3ECF8E] leading-none">{safeRate}%</span>
                <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">safe rate</span>
              </div>
            </div>
          </div>

          {/* Tier 1: Query Console Window */}
          <div className="rounded-[10px] border border-[#2A303C] shadow-[0_0_30px_rgba(139,124,246,0.22)] overflow-hidden">
            {/* Title Bar */}
            <div className="bg-[#1A1F29] border-b border-[#2A303C] px-4 py-1.5 flex items-center justify-between font-mono-code text-[11px] select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EC5F5B]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
                <span className="text-slate-500 font-bold ml-2">
                  {mode === 'generate' ? 'f1_generate.sql' : 'f2_execute.sql'}
                </span>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-1 -mb-1.5">
                <button
                  onClick={() => setMode('generate')}
                  className={`px-3 py-1 border-t border-x rounded-t font-bold transition-all text-[10px] ${
                    mode === 'generate'
                      ? 'bg-[#161A22] border-[#2A303C] text-[#8B7CF6]'
                      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  f1_generate.sql
                </button>
                <button
                  onClick={() => setMode('execute')}
                  className={`px-3 py-1 border-t border-x rounded-t font-bold transition-all text-[10px] ${
                    mode === 'execute'
                      ? 'bg-[#161A22] border-[#2A303C] text-[#3ECF8E]'
                      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  f2_execute.sql
                </button>
              </div>
            </div>

            {/* Console Body */}
            <div className="bg-[#161A22] p-6 text-left flex flex-col gap-4">
              <div className="bg-[#0E1116] border border-[#2A303C] rounded p-4 flex flex-col gap-2 font-mono-code text-[11px]">
                {/* Mode Subtext */}
                <div className="text-slate-500 select-none">
                  <div>-- output: table, chart, text, report, analysis</div>
                  <div>
                    {mode === 'generate'
                      ? '-- Mode: Generates SQL only. No database execution.'
                      : '-- Mode: Generates SQL, validates guardrails, executes safe SELECT queries, and formats output.'}
                  </div>
                </div>
                
                {/* Prompt Label & Input */}
                <div className="flex items-start gap-2 pt-2">
                  <span className="text-[#4FD1C5] font-bold select-none">$ ask:</span>
                  <textarea
                    id="query-input"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleQuery(); }}
                    placeholder="Ask your database, e.g. Show top 5 companies by package as bar graph"
                    className="w-full bg-transparent focus:outline-none text-[#F3F1EA] min-h-[90px] resize-y cursor-blink leading-relaxed"
                    disabled={queryLoading}
                  />
                </div>
              </div>

              {/* Output Format Chips Row */}
              <div className="flex flex-wrap items-center gap-2 font-sans-ui text-[10px] text-slate-400">
                <span className="font-bold select-none mr-1 uppercase text-[9px] tracking-wider text-slate-500">Formats:</span>
                {['Table', 'Bar Chart', 'Pie Chart', 'Text', 'Report', 'Analysis', 'Auto'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleFormatChipClick(fmt)}
                    disabled={queryLoading}
                    className="px-2 py-0.5 bg-[#0E1116] hover:bg-[#202733] border border-[#2A303C] text-slate-400 hover:text-[#F3F1EA] rounded transition-all font-semibold disabled:opacity-50"
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              {/* Submit Row (Visually active/glow only when input has text) */}
              <div className="flex justify-end font-sans-ui mt-2">
                <button
                  id="btn-submit-query"
                  onClick={handleQuery}
                  disabled={!hasText || queryLoading}
                  className={`px-6 py-2.5 rounded font-bold text-xs transition-all ${
                    hasText && !queryLoading
                      ? 'bg-[#8B7CF6] text-white hover:bg-[#8B7CF6]/90 shadow-[0_0_18px_rgba(139,124,246,0.6)] cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-[#2A303C] cursor-not-allowed opacity-50 shadow-none'
                  }`}
                >
                  {queryLoading
                    ? '⏳ Ingesting RAG...'
                    : mode === 'generate'
                    ? 'Generate SQL'
                    : 'Execute Query'}
                </button>
              </div>

              {/* Suggestions */}
              <div className="border-t border-[#2A303C] pt-4 text-left font-sans-ui">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">Quick Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {suggestionsLoading ? (
                    [1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-6 w-36 bg-[#0E1116] border border-[#2A303C] rounded-full animate-pulse opacity-40"
                      />
                    ))
                  ) : (
                    suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        id={`suggestion-${idx}`}
                        onClick={() => handleSuggestionClick(s)}
                        disabled={queryLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0E1116] hover:bg-[#202733] border border-[#2A303C] text-slate-400 hover:text-[#F3F1EA] rounded-full transition-all disabled:opacity-50 font-medium text-[10px]"
                      >
                        <span className="px-1.5 py-0.2 bg-[#4FD1C5]/10 border border-[#4FD1C5]/30 text-[#4FD1C5] text-[8px] rounded uppercase font-bold select-none">
                          {s.output_format}
                        </span>
                        <span className="truncate max-w-[200px]">{s.question}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tier 1: Results Centerpiece Window */}
          <div className="rounded-[10px] border border-[#2A303C] shadow-[0_0_30px_rgba(79,209,197,0.18)] overflow-hidden">
            {/* Title Bar */}
            <div className="bg-[#1A1F29] border-b border-[#2A303C] px-4 py-2 flex items-center justify-between font-mono-code text-[11px] select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EC5F5B]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
                <span className="text-slate-500 font-bold ml-2">results_payload.log</span>
              </div>
              <span className="text-slate-500">json</span>
            </div>

            {/* Output Panel Area */}
            <div className="bg-[#161A22] text-left">
              {queryLoading ? (
                // 5. Animated Loading Steps
                <div className="p-8 font-mono-code text-xs space-y-2 text-slate-400">
                  <div className="text-slate-500 mb-2">-- Executing query grounding pipelines:</div>
                  {[
                    "Retrieving schema from Qdrant",
                    "Generating SQL with LLM",
                    "Running SQL guardrails",
                    "Executing safe SELECT query",
                    "Formatting output"
                  ].map((stepText, idx) => {
                    if (mode === 'generate' && idx === 3) return null;
                    const stepIndex = mode === 'generate' && idx === 4 ? 3 : idx;
                    let stepStatus = "pending";
                    if (stepIndex < loadingStep) {
                      stepStatus = "done";
                    } else if (stepIndex === loadingStep) {
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
                          {stepText}...
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : queryResponse ? (
                <OutputTabs response={queryResponse} mode={mode} />
              ) : (
                // 4. Professional Empty State
                <div className="p-12 text-center font-mono-code text-xs text-slate-500 select-none">
                  <span>-- awaiting query execution_</span>
                  <p className="text-[10px] text-slate-600 mt-2 font-sans-ui max-w-sm mx-auto">
                    Awaiting query execution. Results will appear here as table, chart, text, report, or analysis.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
