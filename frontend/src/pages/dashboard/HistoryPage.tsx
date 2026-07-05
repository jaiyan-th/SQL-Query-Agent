import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { 
  Filter, 
  Download, 
  RefreshCw, 
  Terminal, 
  Copy, 
  Check, 
  ShieldCheck,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { getQueryHistory, type QueryHistoryItem } from '../../services/api';


export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Stored copied status per ID
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getQueryHistory();
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (sql: string, id: number) => {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderSQL = (code: string) => {
    if (!code) return <span className="text-[#7E8A99]">-- No SQL generated</span>;

    const keywords = new Set([
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIMIT',
      'ORDER', 'BY', 'DESC', 'ASC', 'GROUP', 'HAVING', 'JOIN', 'LEFT', 'RIGHT',
      'INNER', 'ON', 'AS', 'WITH', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'BETWEEN', 'LIKE'
    ]);

    return code.split(/(\s+|\b)/).map((part, index) => {
      const upperWord = part.trim().toUpperCase();
      if (keywords.has(upperWord)) {
        return <span key={index} className="text-[#8B7CF6] font-bold">{part}</span>;
      }
      if (/^\d+$/.test(part.trim())) {
        return <span key={index} className="text-[#F5C26B]">{part}</span>;
      }
      if (/^'[^']*'$/.test(part.trim())) {
        return <span key={index} className="text-[#3ECF8E]">{part}</span>;
      }
      return <span key={index} className="text-[#E6E8EF]">{part}</span>;
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 text-left">
        {/* Header Controls */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold font-display text-[#E6E8EF] tracking-tight">
              Query Trace History
            </h2>
            <p className="text-xs text-[#7E8A99] mt-1 font-semibold leading-relaxed">
              Inspect previously executed natural language queries, generated SQL payloads, and security guardrail validation logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input Box mock */}
            <div className="global-search h-[36px] w-56 font-mono text-[11px]">
              <Filter size={12} className="text-[#7E8A99]" />
              <input type="text" placeholder="Filter by query or table..." disabled />
            </div>

            <button 
              onClick={loadHistoryData}
              disabled={loading}
              className="btn-secondary h-[36px] px-3 font-mono text-[10px] uppercase font-bold"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>

            <button className="btn-secondary h-[36px] px-3 font-mono text-[10px] uppercase font-bold" disabled>
              <Download size={12} />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-[#EF5F5F]/5 border border-[#EF5F5F]/35 text-[#EF5F5F] px-4 py-3 rounded text-xs font-mono-code font-bold">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* History Trace List */}
        <div className="flex flex-col gap-6 max-w-5xl">
          {loading && history.length === 0 ? (
            [1, 2].map(n => (
              <div key={n} className="h-64 bg-[#151922] border border-[#252B36] rounded-[6px] animate-pulse" />
            ))
          ) : history.length === 0 ? (
            <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-16 text-center font-mono-code text-xs text-[#7E8A99] select-none">
              <span>-- NO QUERY TRACES RECORDED --</span>
            </div>
          ) : (
            history.map((item) => {
              const isBlocked = item.status === 'blocked' || item.status === 'failed' || item.status === 'error';
              return (
                <div key={item.id} className="trace-card">
                  {/* Card Header */}
                  <div className="trace-card-header">
                    <div className="flex items-center gap-3">
                      <span className={`status-chip ${isBlocked ? 'blocked' : 'executed'}`}>
                        {isBlocked ? 'BLOCKED' : 'EXECUTED'}
                      </span>
                      <span className="text-[11px] text-[#7E8A99] font-mono-code flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[10px] font-mono-code text-[#7E8A99]">
                      {!isBlocked && (
                        <span>LATENCY: <strong className="text-[#3ECF8E]">{item.execution_time_ms || 0}ms</strong></span>
                      )}
                      <span>GATEWAY: <strong className="text-[#8B7CF6]">{item.mode === 'execute' ? 'V1_EXECUTE' : 'V1_GENERATE'}</strong></span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="trace-card-body flex flex-col gap-4 text-left">
                    {/* Natural Query */}
                    <div>
                      <h5 className="font-mono-code text-[9px] text-[#7E8A99] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Terminal size={10} className="text-[#53D6CC]" />
                        <span>NATURAL LANGUAGE QUERY</span>
                      </h5>
                      <p className="text-sm font-semibold text-[#E6E8EF] font-display">
                        "{item.question}"
                      </p>
                    </div>

                    {/* SQL block or Guardrail warning */}
                    {isBlocked ? (
                      <div>
                        <h5 className="font-mono-code text-[9px] text-[#7E8A99] uppercase tracking-wider mb-2 flex items-center gap-1">
                          <ShieldAlert size={10} className="text-[#EF5F5F]" />
                          <span>SQL_GUARDRAIL_VIOLATION</span>
                        </h5>
                        <div className="guardrail-error-block">
                          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                          <div className="text-left font-mono-code text-xs">
                            <strong className="block text-[#E6E8EF] mb-0.5">Policy 'Read-Only-Enforced' rejected query.</strong>
                            {item.error_message || 'Destructive SQL actions (DELETE, DROP, TRUNCATE, ALTER, or administrative PRAGMA/ATTACH commands) are strictly prohibited on workspace environments.'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h5 className="font-mono-code text-[9px] text-[#7E8A99] uppercase tracking-wider mb-2 flex items-center gap-1">
                          <ShieldCheck size={10} className="text-[#3ECF8E]" />
                          <span>SQL_GENERATED</span>
                        </h5>
                        <div className="sql-block-container">
                          <button 
                            onClick={() => handleCopy(item.generated_sql, item.id)} 
                            className="sql-copy-btn border-none"
                            title="Copy SQL"
                          >
                            {copiedId === item.id ? <Check size={14} className="text-[#3ECF8E]" /> : <Copy size={14} />}
                          </button>
                          <pre className="sql-block">
                            <code>{renderSQL(item.generated_sql)}</code>
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Footer metadata details */}
                    <div className="flex flex-wrap items-center justify-between border-t border-[#252B36]/30 pt-4 mt-1 font-mono-code text-[10px] text-[#7E8A99] gap-2">
                      <div className="flex items-center gap-4">
                        <span>Workspace: <strong className="text-[#E6E8EF]">{item.connection_name || 'default'}</strong></span>
                        <span>DB Type: <strong className="text-[#E6E8EF]">{item.database_type || 'sqlite'}</strong></span>

                      </div>
                      <div>
                        <span>Guardrails: <strong className="text-[#3ECF8E]">SELECT_ONLY enforced</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
