import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { OutputTabs } from '../components/OutputTabs';

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

export const AgentPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const [schemaStatus, setSchemaStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Console inputs & outputs
  const [question, setQuestion] = useState('');
  const [outputFormat, setOutputFormat] = useState('auto');
  const [mode, setMode] = useState<'generate' | 'execute'>('execute');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResponse, setQueryResponse] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Pipeline status steps loader
  const [loadingStep, setLoadingStep] = useState(0);

  // Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const connRes = await fetch(`${API_BASE}/api/connections/active`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!connRes.ok) {
        setActiveConnection(null);
        setLoading(false);
        return;
      }
      
      const connData = await connRes.json();
      setActiveConnection(connData);
      
      // Fetch Qdrant RAG sync status
      const ragRes = await fetch(`${API_BASE}/api/rag/status`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (ragRes.ok) {
        const ragData = await ragRes.json();
        setSchemaStatus(ragData);
      }
      
      setLoading(false);
      loadSuggestions();
    } catch (err: any) {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      const res = await fetch(`${API_BASE}/api/suggestions`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Pipeline loader steps timer
  useEffect(() => {
    let timer: any;
    if (queryLoading) {
      setLoadingStep(0);
      timer = setInterval(() => {
        setLoadingStep((prev) => {
          const maxSteps = mode === 'execute' ? 5 : 3;
          return prev < maxSteps ? prev + 1 : prev;
        });
      }, 1400);
    } else {
      setLoadingStep(0);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [queryLoading, mode]);

  const handleQuery = async () => {
    if (!question.trim() || queryLoading) return;
    try {
      setQueryLoading(true);
      setError('');
      setQueryResponse(null);

      const endpoint = mode === 'generate' ? '/api/generate-query' : '/api/generate-and-run';
      const bodyPayload = mode === 'generate' 
        ? { question: question.trim() }
        : { question: question.trim(), output_format: outputFormat };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'SQL generation or execution failed');
      }

      setQueryResponse(data);
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setQueryLoading(false);
    }
  };

  const handleFormatChipClick = (formatKey: string) => {
    setOutputFormat(formatKey);
    if (mode === 'generate') {
      setMode('execute');
    }
  };

  const handleSuggestionClick = (s: any) => {
    setQuestion(s.question);
    if (s.output_format) {
      setOutputFormat(s.output_format);
      if (s.output_format !== 'table' && s.output_format !== 'auto') {
        setMode('execute');
      }
    }
  };

  const pipelineStepsF1 = [
    "Contacting Qdrant schema vectors",
    "Injecting schema context into LLM compiler",
    "Running SQL guardrail validations",
    "Generated SQL preview loaded"
  ];

  const pipelineStepsF2 = [
    "Contacting Qdrant schema vectors",
    "Injecting schema context into LLM compiler",
    "Running SQL guardrail validations",
    "Connecting securely to target database live",
    "Executing safe SELECT statement",
    "Formatting query execution dataset"
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-slate-400 font-mono-code text-xs">
          Loading connection environment...
        </div>
      </DashboardLayout>
    );
  }

  // Enforce redirection if no active database is connection-registered
  if (!activeConnection || !schemaStatus?.indexed) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-xl mx-auto flex flex-col gap-6 text-center mt-16 bg-[#161A22] border border-[#2A303C] rounded-[10px] items-center">
          <span className="text-3xl">🔌</span>
          <h3 className="text-lg font-bold text-[#F3F1EA] font-display">Connect and sync your database before asking queries</h3>
          <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">
            QueryGen AI requires a registered target datastore and semantic RAG schema index to ground query generation.
          </p>
          <button
            onClick={() => navigate('/dashboard/setup')}
            className="px-5 py-2.5 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#0E1116] rounded font-sans-ui font-bold text-xs shadow-[0_0_15px_rgba(62,207,142,0.35)] transition-all"
          >
            Go to Setup Page
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const formatOptions = [
    { key: 'auto', label: 'Auto' },
    { key: 'table', label: 'Table' },
    { key: 'bar_chart', label: 'Bar Chart' },
    { key: 'pie_chart', label: 'Pie Chart' },
    { key: 'text', label: 'Text Summary' },
    { key: 'report', label: 'Report' },
    { key: 'analysis', label: 'Analysis' }
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

        {/* Status Header */}
        <div className="bg-[#161A22] border border-[#2A303C] rounded px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-[10px] text-slate-400 font-mono-code">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
              Connected: <span className="text-[#F3F1EA]">{activeConnection.masked_url}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span>
              Dialect: <span className="text-[#8B7CF6] font-bold uppercase">{activeConnection.database_type}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4FD1C5]" />
              Schema Index Active
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold font-display text-[#F3F1EA] tracking-tight">
            SQL Query Agent Console
          </h2>
          <p className="text-xs text-slate-400">
            Generate dialect-specific SQL, execute SELECT queries safely under secure guardrails, and output results as tables, charts, text, or reports.
          </p>
        </div>

        {/* Mode Selector cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setMode('generate')}
            className={`border rounded-lg p-4 cursor-pointer text-left transition-all ${
              mode === 'generate'
                ? 'border-[#8B7CF6] bg-[#8B7CF6]/5 shadow-[0_0_15px_rgba(139,124,246,0.1)]'
                : 'border-[#2A303C] bg-[#161A22] opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono-code font-bold text-[10px] text-[#8B7CF6]">Function 1</span>
              {mode === 'generate' && <span className="text-[9px] font-sans-ui bg-[#8B7CF6]/15 px-2 py-0.5 rounded text-[#8B7CF6] font-bold">Active</span>}
            </div>
            <h4 className="text-xs font-bold text-[#F3F1EA]">Generate SQL Only</h4>
            <p className="text-[10px] text-slate-500 mt-1">
              Generates dialect-specific SQL using Qdrant schemas. Strictly does not execute commands.
            </p>
          </div>

          <div
            onClick={() => setMode('execute')}
            className={`border rounded-lg p-4 cursor-pointer text-left transition-all ${
              mode === 'execute'
                ? 'border-[#3ECF8E] bg-[#3ECF8E]/5 shadow-[0_0_15px_rgba(62,207,142,0.1)]'
                : 'border-[#2A303C] bg-[#161A22] opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono-code font-bold text-[10px] text-[#3ECF8E]">Function 2</span>
              {mode === 'execute' && <span className="text-[9px] font-sans-ui bg-[#3ECF8E]/15 px-2 py-0.5 rounded text-[#3ECF8E] font-bold">Active</span>}
            </div>
            <h4 className="text-xs font-bold text-[#F3F1EA]">Generate & Execute</h4>
            <p className="text-[10px] text-slate-500 mt-1">
              Generates SQL, validates guardrails, executes safe SELECT queries on your connected database, and formats results.
            </p>
          </div>
        </div>

        {/* Console Input area */}
        <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-6 shadow-md flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-500 mb-1">
              <span>Terminal Query Interface</span>
            </div>
            
            <div className="relative bg-[#0E1116] border border-[#2A303C] rounded p-3 flex gap-2 items-start focus-within:ring-1 focus-within:ring-[#4FD1C5]">
              <span className="font-mono text-[#8B7CF6] select-none mt-1.5">$ ask:</span>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask your database, e.g. Show top 5 products by sales as bar chart"
                className="w-full bg-transparent border-none outline-none text-xs text-[#F3F1EA] font-mono resize-none h-16 mt-1"
                disabled={queryLoading}
              />
            </div>
          </div>

          {/* Output Format Selectors */}
          <div className="flex flex-col gap-2">
            <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Output Format Selection</span>
            <div className="flex flex-wrap gap-2">
              {formatOptions.map((opt) => {
                const isActive = outputFormat === opt.key && mode === 'execute';
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleFormatChipClick(opt.key)}
                    disabled={mode === 'generate'}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono border transition-all ${
                      isActive
                        ? 'border-[#3ECF8E] bg-[#3ECF8E]/10 text-[#3ECF8E] font-bold'
                        : 'border-[#2A303C] bg-[#0E1116] text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Execution Button */}
          <div className="flex justify-between items-center mt-2 border-t border-[#2A303C]/40 pt-4 font-sans-ui">
            <span className="text-[10px] text-slate-500 leading-normal max-w-md">
              * Guardrails block write statement keywords (INSERT, DELETE, DROP, etc.) to keep query targets fully read-only.
            </span>
            <button
              onClick={handleQuery}
              disabled={!question.trim() || queryLoading}
              className={`px-6 py-2.5 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'generate'
                  ? 'bg-[#8B7CF6] hover:bg-[#8B7CF6]/90 text-white shadow-[0_0_15px_rgba(139,124,246,0.35)]'
                  : 'bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#0E1116] shadow-[0_0_15px_rgba(62,207,142,0.35)]'
              }`}
            >
              {queryLoading ? 'Processing...' : mode === 'generate' ? 'Generate SQL' : 'Generate & Execute'}
            </button>
          </div>

          {/* Suggestions loading states / Chips */}
          <div className="border-t border-[#2A303C]/40 pt-4 flex flex-col gap-2 text-left">
            <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Quick Suggestions</span>
            {suggestionsLoading ? (
              <div className="flex flex-wrap gap-2 animate-pulse">
                <div className="h-6 w-32 bg-[#0E1116] border border-[#2A303C] rounded-full" />
                <div className="h-6 w-48 bg-[#0E1116] border border-[#2A303C] rounded-full" />
                <div className="h-6 w-40 bg-[#0E1116] border border-[#2A303C] rounded-full" />
              </div>
            ) : suggestions.length === 0 ? (
              <span className="text-[10px] text-slate-600 font-mono">No specific suggestions found for this schema setup.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s)}
                    className="px-3 py-1 bg-[#0E1116] hover:bg-[#1A1F29] border border-[#2A303C] hover:border-[#4FD1C5] rounded text-[10px] text-slate-400 font-mono transition-all"
                  >
                    🔍 {s.question}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loading Pipeline Stages */}
        {queryLoading && (
          <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-6 shadow-md font-mono-code text-[11px] space-y-2 text-slate-400">
            <span className="text-slate-500 block font-sans-ui font-semibold text-[9px] uppercase tracking-wider mb-2">Agent Execution Loader</span>
            {(mode === 'generate' ? pipelineStepsF1 : pipelineStepsF2).map((step, idx) => {
              let stepStatus = "pending";
              if (idx < loadingStep) {
                stepStatus = "done";
              } else if (idx === loadingStep) {
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

        {/* Results Panels */}
        {queryResponse && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-bold text-[#F3F1EA]">Pipeline Results Response</h3>
              {mode === 'execute' && (
                <span className="text-[10px] text-slate-500 font-mono-code">
                  Execution completed in <span className="text-[#3ECF8E] font-bold">{queryResponse.execution_time_ms} ms</span> | <span className="text-[#4FD1C5] font-bold">{queryResponse.row_count} rows</span>
                </span>
              )}
            </div>
            
            <OutputTabs response={queryResponse} mode={mode} />
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
