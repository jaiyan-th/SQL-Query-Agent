import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
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

export const AgentPage: React.FC = () => {
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [schemaIndexed, setSchemaIndexed] = useState(false);
  const [tablesIndexed, setTablesIndexed] = useState(0);
  const [llmProvider, setLlmProvider] = useState('Groq');
  
  const [queryLoading, setQueryLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'generate' | 'execute'>('generate');
  const [queryResponse, setQueryResponse] = useState<any>(null);
  const [error, setError] = useState('');

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
        if (data.llm && data.llm.provider) {
          setLlmProvider(data.llm.provider);
        }
      })
      .catch(() => {});

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
    return () => { if (timer) clearInterval(timer); };
  }, [queryLoading, mode]);

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
    } catch (err: any) {
      setError(err.message || 'Query execution failed');
    } finally {
      setQueryLoading(false);
    }
  };

  const handleFormatChipClick = (formatLabel: string) => {
    if (mode === 'generate') {
      // In Function 1 mode, format chips switch mode to execute
      setMode('execute');
    }

    let cleanQuestion = question
      .replace(/\s+as\s+(table|bar\s+chart|bar\s+graph|pie\s+chart|report|analysis)$/i, '')
      .replace(/\s+in\s+text$/i, '')
      .replace(/\s+with\s+analysis$/i, '')
      .trim();

    if (formatLabel === 'Table') {
      setQuestion(cleanQuestion + " as table");
    } else if (formatLabel === 'Bar Chart') {
      setQuestion(cleanQuestion + " as bar chart");
    } else if (formatLabel === 'Pie Chart') {
      setQuestion(cleanQuestion + " as pie chart");
    } else if (formatLabel === 'Text') {
      setQuestion(cleanQuestion + " in text");
    } else if (formatLabel === 'Report') {
      setQuestion(cleanQuestion + " as report");
    } else if (formatLabel === 'Analysis') {
      setQuestion(cleanQuestion + " with analysis");
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

  const hasText = question.trim().length > 0;

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

        {/* Top Status Bar */}
        <div className="bg-[#161A22] border border-[#2A303C] rounded px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-[10px] text-slate-400 font-sans-ui flex-shrink-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
              API Online
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${databaseConnected ? 'bg-[#3ECF8E] animate-pulse' : 'bg-slate-600'}`} />
              Postgres {databaseConnected ? 'Connected' : 'Offline'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${schemaIndexed ? 'bg-[#4FD1C5] animate-pulse' : 'bg-slate-600'}`} />
              Qdrant Indexed ({tablesIndexed} tables)
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5 font-medium uppercase tracking-wider text-[9px] text-[#8B7CF6]">
              LLM Provider: {llmProvider}
            </span>
          </div>
        </div>

        {/* Header Titles */}
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold font-display text-[#F3F1EA] tracking-tight">
            SQL Query Agent Console
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl">
            Generate syntax-validated SQL, execute SELECT queries safely under secure guardrails, and output results as tables, graphs, pie charts, reports, or summaries.
          </p>
        </div>

        {/* Two Functions Selector Segment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* F1 Card */}
          <div
            onClick={() => setMode('generate')}
            className={`border rounded-lg p-5 cursor-pointer text-left transition-all ${
              mode === 'generate'
                ? 'border-[#8B7CF6] bg-[#8B7CF6]/5 shadow-[0_0_15px_rgba(139,124,246,0.1)]'
                : 'border-[#2A303C] bg-[#161A22] opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-code font-bold text-xs text-[#8B7CF6]">Function 1</span>
              {mode === 'generate' && <span className="text-[10px] font-sans-ui font-semibold text-[#8B7CF6] bg-[#8B7CF6]/10 px-2 py-0.5 rounded-full">Active</span>}
            </div>
            <h4 className="text-sm font-bold text-[#F3F1EA]">Generate SQL Only</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              Compile natural language questions directly to validated SQL using Qdrant schemas and LLMs. Strictly does not execute commands.
            </p>
          </div>

          {/* F2 Card */}
          <div
            onClick={() => setMode('execute')}
            className={`border rounded-lg p-5 cursor-pointer text-left transition-all ${
              mode === 'execute'
                ? 'border-[#3ECF8E] bg-[#3ECF8E]/5 shadow-[0_0_15px_rgba(62,207,142,0.1)]'
                : 'border-[#2A303C] bg-[#161A22] opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-code font-bold text-xs text-[#3ECF8E]">Function 2</span>
              {mode === 'execute' && <span className="text-[10px] font-sans-ui font-semibold text-[#3ECF8E] bg-[#3ECF8E]/10 px-2 py-0.5 rounded-full">Active</span>}
            </div>
            <h4 className="text-sm font-bold text-[#F3F1EA]">Generate & Execute</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              Extends Function 1 by validating generated code against SQL injection filters, executing safe read-only queries, and rendering visual output formats.
            </p>
          </div>
        </div>

        {/* Query Input Section */}
        <div className="rounded-[10px] border border-[#2A303C] shadow-[0_0_20px_rgba(0,0,0,0.2)] overflow-hidden">
          <div className="bg-[#1A1F29] border-b border-[#2A303C] px-4 py-2 flex items-center justify-between font-mono-code text-[11px] select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EC5F5B]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
              <span className="text-slate-500 font-bold ml-2">
                {mode === 'generate' ? 'f1_generate.sql' : 'f2_execute.sql'}
              </span>
            </div>
            <span className="text-slate-600 font-mono-code">sql</span>
          </div>

          <div className="bg-[#161A22] p-6 flex flex-col gap-4">
            <div className="bg-[#0E1116] border border-[#2A303C] rounded p-4 flex flex-col gap-2 font-mono-code text-[11px]">
              <div className="text-slate-500 select-none">
                <div>-- target formats: table, bar_chart, pie_chart, text, report, analysis</div>
                <div>-- schema grounded: BAAI/bge-small-en-v1.5 embeddings</div>
              </div>
              <div className="flex items-start gap-2 pt-2">
                <span className="text-[#4FD1C5] font-bold select-none">$ ask:</span>
                <textarea
                  id="query-input"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleQuery(); }}
                  placeholder="Ask your database, e.g. Show top 5 companies by package as bar chart"
                  className="w-full bg-transparent focus:outline-none text-[#F3F1EA] min-h-[90px] resize-y cursor-blink leading-relaxed"
                  disabled={queryLoading}
                />
              </div>
            </div>

            {/* Output Format Chips Row */}
            <div className="flex flex-wrap items-center gap-2 font-sans-ui text-[10px] text-slate-400">
              <span className="font-bold select-none mr-1 uppercase text-[9px] tracking-wider text-slate-500">Output Format:</span>
              {['Auto', 'Table', 'Bar Chart', 'Pie Chart', 'Text', 'Report', 'Analysis'].map((fmt) => {
                const isFormatActive = mode === 'execute';
                return (
                  <button
                    key={fmt}
                    onClick={() => handleFormatChipClick(fmt)}
                    disabled={queryLoading}
                    className={`px-2.5 py-0.5 rounded transition-all font-semibold ${
                      isFormatActive
                        ? 'bg-[#0E1116] hover:bg-[#202733] border border-[#2A303C] text-slate-300 hover:text-white'
                        : 'bg-transparent border border-dashed border-[#2A303C]/40 text-slate-600 cursor-help'
                    }`}
                    title={!isFormatActive ? 'Execution-only format. Clicking this switches mode to Generate & Execute.' : ''}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>

            {/* Submit Row */}
            <div className="flex justify-end font-sans-ui mt-2">
              <button
                id="btn-submit-query"
                onClick={handleQuery}
                disabled={!hasText || queryLoading}
                className={`px-6 py-2.5 rounded font-bold text-xs transition-all ${
                  hasText && !queryLoading
                    ? mode === 'generate'
                      ? 'bg-[#8B7CF6] text-white hover:bg-[#8B7CF6]/90 shadow-[0_0_18px_rgba(139,124,246,0.55)] cursor-pointer'
                      : 'bg-[#3ECF8E] text-[#0E1116] hover:bg-[#3ECF8E]/90 shadow-[0_0_18px_rgba(62,207,142,0.55)] cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-[#2A303C] cursor-not-allowed opacity-50 shadow-none'
                }`}
              >
                {queryLoading
                  ? '⏳ Grounding RAG...'
                  : mode === 'generate'
                  ? 'Generate SQL'
                  : 'Generate & Execute'}
              </button>
            </div>

            {/* Schema Grounded Dynamic Suggestions */}
            {(suggestionsLoading || (suggestions && suggestions.length > 0)) && (
              <div className="border-t border-[#2A303C]/40 pt-4 text-left font-sans-ui">
                <div className="mb-2.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Schema-Grounded Suggestions</p>
                  <p className="text-[8px] text-slate-600 font-semibold font-sans-ui">Generated dynamically from your connected PostgreSQL database.</p>
                </div>
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
            )}
          </div>
        </div>

        {/* Results Area Panel */}
        <div className="rounded-[10px] border border-[#2A303C] shadow-[0_0_30px_rgba(79,209,197,0.18)] overflow-hidden">
          <div className="bg-[#1A1F29] border-b border-[#2A303C] px-4 py-2 flex items-center justify-between font-mono-code text-[11px] select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EC5F5B]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
              <span className="text-slate-500 font-bold ml-2">results_payload.log</span>
            </div>
            {queryResponse && (
              <div className="flex items-center gap-4 text-[9px] text-slate-500">
                {queryResponse.execution_time_ms !== undefined && (
                  <span>time: <span className="text-[#3ECF8E] font-bold">{queryResponse.execution_time_ms}ms</span></span>
                )}
                {queryResponse.row_count !== undefined && (
                  <span>rows: <span className="text-[#4FD1C5] font-bold">{queryResponse.row_count}</span></span>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#161A22] text-left min-h-[160px] flex flex-col justify-center">
            {queryLoading ? (
              <div className="p-8 font-mono-code text-xs space-y-2 text-slate-400 w-full">
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
              <div className="w-full">
                {mode === 'generate' && (
                  <div className="bg-[#8B7CF6]/5 border-b border-[#2A303C] px-6 py-2 flex items-center gap-2 font-mono-code text-[10px] text-[#8B7CF6] font-bold">
                    <span>💡 Note:</span>
                    <span>This mode only generates SQL. It does not execute queries.</span>
                  </div>
                )}
                <OutputTabs response={queryResponse} mode={mode} />
              </div>
            ) : (
              <div className="p-12 text-center font-mono-code text-xs text-slate-500 w-full flex flex-col items-center select-none">
                <span>-- awaiting query execution_</span>
                <p className="text-[10px] text-slate-600 mt-2 font-sans-ui max-w-sm">
                  Awaiting query execution. Results will appear here as table, chart, text, report, or analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
