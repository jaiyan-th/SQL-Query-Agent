import React, { useState, useEffect } from 'react';
import { GenerateQueryResponse, GenerateAndRunResponse } from '../api/client';
import { GuardrailsPanel } from './GuardrailsPanel';
import { ResultTable } from './ResultTable';

interface OutputTabsProps {
  response: GenerateQueryResponse | GenerateAndRunResponse | null;
  mode: 'generate' | 'execute';
}

type TabType = 'table' | 'sql' | 'rag' | 'guardrails';

export const OutputTabs: React.FC<OutputTabsProps> = ({ response, mode }) => {
  const [activeTab, setActiveTab] = useState<TabType>('sql');

  const isExecuteResponse = (r: any): r is GenerateAndRunResponse => {
    return r && 'columns' in r && 'rows' in r;
  };

  // Automatically switch tab when response changes based on the mode
  useEffect(() => {
    if (response) {
      if (mode === 'execute' && isExecuteResponse(response)) {
        setActiveTab('table');
      } else {
        setActiveTab('sql');
      }
    }
  }, [response, mode]);

  if (!response) {
    return null;
  }

  const executeResponse = isExecuteResponse(response) ? response : null;
  const hasExecution = mode === 'execute' && executeResponse !== null;

  const copyToClipboard = () => {
    const sqlText = response.generated_sql || response.sql;
    navigator.clipboard.writeText(sqlText);
    alert('SQL copied to clipboard!');
  };

  // Custom SQL syntax highlighting parser matching landing page colors
  const renderHighlightedSQL = (sqlText: string) => {
    if (!sqlText) return <span className="text-slate-500">-- No SQL generated.</span>;
    
    const words = sqlText.split(/(\s+|\b)/);
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'LIMIT', 'ORDER', 'BY', 'DESC', 'ASC',
      'JOIN', 'ON', 'LEFT', 'INNER', 'GROUP', 'AS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ];
    const databaseTables = ['companies', 'placements', 'students', 'users', 'applications'];

    return words.map((part, idx) => {
      const trimmedUpper = part.trim().toUpperCase();
      const trimmedLower = part.trim().toLowerCase();
      
      if (keywords.includes(trimmedUpper)) {
        return <span key={idx} className="text-[#8B7CF6] font-bold">{part}</span>;
      }
      if (databaseTables.includes(trimmedLower)) {
        return <span key={idx} className="text-[#4FD1C5] font-bold">{part}</span>;
      }
      if (/^\d+$/.test(part.trim())) {
        return <span key={idx} className="text-[#F5B942]">{part}</span>;
      }
      if (part.startsWith("'") && part.endsWith("'")) {
        return <span key={idx} className="text-[#3ECF8E]">{part}</span>;
      }
      return <span key={idx} className="text-[#F3F1EA]">{part}</span>;
    });
  };

  const sqlText = response.generated_sql || response.sql;

  return (
    <div className="bg-[#161A22] text-left">
      {/* Tab Headers */}
      <div className="border-b border-[#2A303C] px-4 bg-[#161A22] overflow-x-auto scrollbar-thin">
        <div className="flex gap-2 -mb-px py-2 whitespace-nowrap font-mono-code text-[11px]">
          {/* Table Tab (Only enabled if mode === 'execute') */}
          <button
            onClick={() => { if (hasExecution) setActiveTab('table'); }}
            disabled={!hasExecution}
            title={!hasExecution ? 'Available in Generate & Execute mode' : undefined}
            className={`px-3 py-1.5 font-bold rounded transition-all ${
              activeTab === 'table'
                ? 'bg-[#3ECF8E] text-[#0E1116]'
                : !hasExecution
                ? 'opacity-30 cursor-not-allowed text-slate-500'
                : 'text-slate-400 hover:bg-[#0E1116] hover:text-[#F3F1EA]'
            }`}
          >
            Table
          </button>

          {/* Active Tabs in Both Modes */}
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-1.5 font-bold rounded transition-all ${
              activeTab === 'sql' ? 'bg-[#8B7CF6] text-[#0E1116]' : 'text-slate-400 hover:bg-[#0E1116] hover:text-[#F3F1EA]'
            }`}
          >
            SQL
          </button>
          <button
            onClick={() => setActiveTab('rag')}
            className={`px-3 py-1.5 font-bold rounded transition-all ${
              activeTab === 'rag' ? 'bg-[#4FD1C5] text-[#0E1116]' : 'text-slate-400 hover:bg-[#0E1116] hover:text-[#F3F1EA]'
            }`}
          >
            RAG Context
          </button>
          <button
            onClick={() => setActiveTab('guardrails')}
            className={`px-3 py-1.5 font-bold rounded transition-all ${
              activeTab === 'guardrails' ? 'bg-[#F5B942] text-[#0E1116]' : 'text-slate-400 hover:bg-[#0E1116] hover:text-[#F3F1EA]'
            }`}
          >
            Guardrails
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Table Tab */}
        {activeTab === 'table' && executeResponse && (
          <ResultTable
            columns={executeResponse.columns}
            rows={executeResponse.rows}
            rowCount={executeResponse.row_count}
          />
        )}

        {/* SQL Tab */}
        {activeTab === 'sql' && (
          <div className="font-mono-code text-xs">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-[#F3F1EA]">-- Generated query:</h3>
              <button
                onClick={copyToClipboard}
                className="px-2 py-1 bg-[#0E1116] hover:bg-[#202733] border border-[#2A303C] text-slate-400 hover:text-[#F3F1EA] rounded transition-all"
              >
                Copy SQL
              </button>
            </div>
            <pre className="bg-[#0E1116] p-4 rounded border border-[#2A303C] overflow-x-auto shadow-inner text-xs font-mono leading-relaxed">
              <code>{renderHighlightedSQL(sqlText)}</code>
            </pre>
            <div className="mt-4 bg-[#0E1116] border border-[#2A303C] p-4 rounded text-left">
              <h4 className="font-bold text-[#8B7CF6] mb-1.5">Explanation</h4>
              <p className="text-slate-300 leading-normal">{response.explanation}</p>
            </div>
          </div>
        )}

        {/* RAG Context Tab */}
        {activeTab === 'rag' && (
          <div className="font-mono-code text-xs">
            <h3 className="font-bold text-[#4FD1C5] mb-4">-- retrieved_schema_context</h3>
            {!response.schema_context || response.schema_context.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No schema context retrieved</p>
            ) : (
              <div className="space-y-3 text-left">
                {response.schema_context.map((ctx, idx) => (
                  <div key={idx} className="bg-[#0E1116] border border-[#2A303C] rounded p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="px-2 py-0.5 bg-[#4FD1C5]/10 border border-[#4FD1C5]/30 text-[#4FD1C5] text-[10px] rounded">
                          [table] {ctx.table_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">
                        Relevance: {(ctx.relevance_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <pre className="text-[11px] text-slate-400 whitespace-pre-wrap bg-[#161A22] p-3 rounded border border-[#2A303C] font-mono leading-normal">
                      {ctx.content}
                    </pre>
                  </div>
                ))}
                <div className="bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 rounded p-3 text-[#3ECF8E]">
                  <p className="font-bold">
                    ✅ Schema context grounded generation successfully verified via Qdrant Cloud
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guardrails Tab */}
        {activeTab === 'guardrails' && (
          <div>
            <h3 className="font-mono-code text-xs font-bold text-[#F5B942] mb-4 text-left">-- sql_guardrail_verifications</h3>
            <GuardrailsPanel safetyStatus={response.safety_status} />
          </div>
        )}
      </div>
    </div>
  );
};
