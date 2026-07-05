import React, { useState, useEffect } from 'react';
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

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/api/history`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        throw new Error('Failed to load history logs');
      }
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-bold font-display text-[#F3F1EA] tracking-tight">
              Query History
            </h2>
            <p className="text-xs text-slate-400">
              Audit log of previous prompts, generated query scripts, execution scopes, and guardrail reports.
            </p>
          </div>
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="px-4 py-2 bg-[#161A22] border border-[#2A303C] hover:bg-[#1A1F29] rounded text-xs font-semibold text-slate-300 transition-colors flex-shrink-0 font-sans-ui"
          >
            {historyLoading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* History List */}
          <div className={`flex flex-col gap-3 ${selectedItem ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
            {historyLoading && history.length === 0 ? (
              [1, 2, 3].map((n) => (
                <div key={n} className="h-24 bg-[#161A22] border border-[#2A303C] rounded-[10px] animate-pulse" />
              ))
            ) : history.length === 0 ? (
              <div className="bg-[#161A22] border border-[#2A303C] rounded-[10px] p-12 text-center font-mono-code text-xs text-slate-500 select-none">
                <span>-- history file is empty --</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-230px)] overflow-y-auto pr-1 scrollbar-thin">
                {history.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`border rounded-[10px] p-4 text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#4FD1C5] bg-[#4FD1C5]/5 shadow-[0_0_15px_rgba(79,209,197,0.1)]'
                          : 'border-[#2A303C] bg-[#161A22] hover:bg-[#1A1F29]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <p className="text-xs text-slate-200 font-bold truncate flex-1 font-mono">
                          {item.question}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono border ${
                          item.status === 'success'
                            ? 'text-[#3ECF8E] bg-[#3ECF8E]/10 border-[#3ECF8E]/20'
                            : item.status === 'blocked'
                            ? 'text-[#F5B942] bg-[#F5B942]/10 border-[#F5B942]/20'
                            : 'text-[#EC5F5B] bg-[#EC5F5B]/10 border-[#EC5F5B]/20'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] font-mono text-slate-500 border-t border-[#2A303C]/30 pt-2.5 mt-2">
                        <div>
                          Scope: <span className="text-slate-400 font-semibold">{item.mode === 'generate' ? 'f1_generate_only' : 'f2_execute'}</span>
                        </div>
                        <div>
                          DB: <span className="text-[#8B7CF6] font-bold uppercase">{item.database_type}</span>
                        </div>
                        <div>
                          Connection: <span className="text-slate-400 font-semibold">{item.connection_name}</span>
                        </div>
                        {item.mode === 'execute' && item.row_count !== null && (
                          <div>
                            Rows: <span className="text-slate-400 font-semibold">{item.row_count}</span>
                          </div>
                        )}
                        <div>
                          Time: <span className="text-slate-400 font-semibold">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details Panel View */}
          {selectedItem && (
            <div className="lg:col-span-6 bg-[#161A22] border border-[#2A303C] rounded-[10px] shadow-lg overflow-hidden flex flex-col">
              <div className="bg-[#1A1F29] border-b border-[#2A303C] px-4 py-2 flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EC5F5B] cursor-pointer" onClick={() => setSelectedItem(null)} />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
                  <span className="text-slate-500 font-bold ml-2">history_payload_{selectedItem.id}.log</span>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-slate-500 hover:text-slate-300 font-bold font-sans-ui"
                >
                  [x] close
                </button>
              </div>

              <div className="p-6 text-left font-mono text-xs space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                <div>
                  <h4 className="font-sans-ui font-semibold text-[9px] uppercase tracking-wider text-slate-500 mb-1">Natural Language Query</h4>
                  <p className="text-slate-300 leading-relaxed font-bold">{selectedItem.question}</p>
                </div>

                <div className="border-t border-[#2A303C]/40 pt-3">
                  <h4 className="font-sans-ui font-semibold text-[9px] uppercase tracking-wider text-slate-500 mb-2">Compiled SQL</h4>
                  <pre className="bg-[#0E1116] border border-[#2A303C] rounded p-4 overflow-x-auto text-green-400 font-mono leading-relaxed">
                    <code>{selectedItem.generated_sql || '-- SQL compile failed'}</code>
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[#2A303C]/40 pt-3">
                  <div>
                    <span className="font-sans-ui font-semibold text-[9px] uppercase tracking-wider text-slate-500 block mb-0.5">Execution Scope</span>
                    <span className="text-[#8B7CF6] font-bold">{selectedItem.mode === 'generate' ? 'Generate SQL Only (F1)' : 'Generate & Execute (F2)'}</span>
                  </div>
                  <div>
                    <span className="font-sans-ui font-semibold text-[9px] uppercase tracking-wider text-slate-500 block mb-0.5">Status</span>
                    <span className={`font-bold ${
                      selectedItem.status === 'success' ? 'text-[#3ECF8E]' : 
                      selectedItem.status === 'blocked' ? 'text-[#F5B942]' : 
                      'text-[#EC5F5B]'
                    }`}>{selectedItem.status.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="font-sans-ui font-semibold text-[9px] uppercase tracking-wider text-slate-500 block mb-0.5">Database Dialect</span>
                    <span className="text-slate-300 uppercase font-bold">{selectedItem.database_type}</span>
                  </div>
                  <div>
                    <span className="font-sans-ui font-semibold text-[9px] uppercase tracking-wider text-slate-500 block mb-0.5">Connection Target</span>
                    <span className="text-slate-300">{selectedItem.connection_name}</span>
                  </div>
                  {selectedItem.mode === 'execute' && selectedItem.execution_time_ms !== null && (
                    <div>
                      <span className="font-sans-ui font-semibold text-[9px] uppercase tracking-wider text-slate-500 block mb-0.5">Runtime Speed</span>
                      <span className="text-[#3ECF8E] font-bold">{selectedItem.execution_time_ms} ms</span>
                    </div>
                  )}
                  {selectedItem.mode === 'execute' && selectedItem.row_count !== null && (
                    <div>
                      <span className="font-sans-ui font-semibold text-[9px] uppercase tracking-wider text-slate-500 block mb-0.5">Rows Returned</span>
                      <span className="text-[#4FD1C5] font-bold">{selectedItem.row_count}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-sans-ui font-semibold text-[9px] uppercase tracking-wider text-slate-500 block mb-0.5">Recorded At</span>
                    <span className="text-slate-300">{new Date(selectedItem.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {selectedItem.error_message && (
                  <div className="border-t border-[#2A303C]/40 pt-3">
                    <span className="font-sans-ui font-semibold text-[9px] uppercase tracking-wider text-red-400 block mb-1">Execution / Block Reason</span>
                    <div className="bg-red-950/20 border border-red-900/60 text-red-400 p-3 rounded text-[11px]">
                      {selectedItem.error_message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
