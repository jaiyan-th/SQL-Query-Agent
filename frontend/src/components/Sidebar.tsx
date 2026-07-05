import React, { useState, useEffect } from 'react';

interface SidebarProps {
  dbUrl: string;
  setDbUrl: (url: string) => void;
  connectionLoading: boolean;
  databaseConnected: boolean;
  handleTestConnection: () => void;
  schemaIndexed: boolean;
  tablesIndexed: number;
  history: any[];
  historyLoading: boolean;
  loadHistory: () => void;
  setQuestion: (q: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  dbUrl,
  setDbUrl,
  connectionLoading,
  databaseConnected,
  handleTestConnection,
  schemaIndexed,
  tablesIndexed,
  history,
  historyLoading,
  loadHistory,
  setQuestion
}) => {
  const [isEditing, setIsEditing] = useState(!databaseConnected);

  // Auto-collapse edit panel once connected successfully
  useEffect(() => {
    if (databaseConnected) {
      setIsEditing(false);
    }
  }, [databaseConnected]);

  // Helper to mask connection credentials: postgresql://username:password@host:port/database
  const getMaskedUrl = (url: string) => {
    if (!url) return '';
    try {
      // Simple regex masking of password part
      const matches = url.match(/^(postgresql:\/\/)([^:]+):([^@]+)(@.+)$/);
      if (matches && matches.length >= 5) {
        return `${matches[1]}${matches[2]}:******${matches[4]}`;
      }
      return url.replace(/:[^:/@]+@/, ':******@');
    } catch {
      return 'postgresql://*****@host:5432/db';
    }
  };

  const getFormatFromQuestion = (q: string) => {
    const qLower = q.toLowerCase();
    if (qLower.includes('as table') || qLower.includes('tabular')) return 'table';
    if (qLower.includes('bar graph') || qLower.includes('bar chart')) return 'bar_chart';
    if (qLower.includes('pie chart')) return 'pie_chart';
    if (qLower.includes('in text') || qLower.includes('summary')) return 'text';
    if (qLower.includes('report')) return 'report';
    if (qLower.includes('analysis') || qLower.includes('trends')) return 'analysis';
    return 'auto';
  };

  return (
    <aside className="w-80 p-6 flex flex-col justify-between border-r border-[#2A303C] bg-[#161A22] h-[calc(100vh-70px)] select-none font-sans-ui">
      <div className="flex flex-col gap-6 flex-1 min-h-0">
        {/* 1. Database Connection Card */}
        <div className="bg-[#161A22] border border-[#2A303C] rounded p-4 text-left">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <span>🔌</span> connection
            </h3>
            {databaseConnected && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-[9px] font-semibold text-[#4FD1C5] hover:underline"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              {isEditing ? (
                <input
                  id="db-url-input"
                  type="text"
                  value={dbUrl}
                  onChange={(e) => setDbUrl(e.target.value)}
                  placeholder="postgresql://username:password@host:5432/db"
                  className="w-full px-2.5 py-1.5 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-[10px] font-mono-code text-[#F3F1EA] shadow-inner"
                  disabled={connectionLoading}
                />
              ) : (
                <div className="w-full px-2.5 py-1.5 bg-[#0E1116] border border-[#2A303C] rounded text-[10px] font-mono-code text-slate-400 select-all truncate">
                  {getMaskedUrl(dbUrl)}
                </div>
              )}
              <p className="text-[9px] text-slate-500 mt-1 font-mono-code">
                -- Credentials stored backend-only
              </p>
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <button
                  id="btn-test-connection"
                  onClick={handleTestConnection}
                  disabled={!dbUrl.trim() || connectionLoading}
                  className="flex-1 px-2 py-1 bg-[#4FD1C5] text-[#0E1116] rounded text-[10px] font-semibold hover:bg-[#4FD1C5]/90 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors shadow"
                >
                  {connectionLoading ? 'Testing...' : 'Test & Save'}
                </button>
              </div>
            )}

            {!isEditing && databaseConnected && (
              <div className="flex items-center justify-between text-[9px] text-[#3ECF8E] bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 px-2.5 py-1.5 rounded font-mono-code font-bold">
                <span>✅ Connected</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Qdrant Status Card */}
        <div className="bg-[#161A22] border border-[#2A303C] rounded p-4 text-left font-mono-code text-[10px]">
          <h3 className="text-[10px] font-sans-ui font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1.5 mb-2">
            <span>🧠</span> grounding status
          </h3>
          <div className="space-y-1 text-slate-400">
            <div>
              <span className="text-slate-500">Qdrant:</span>{' '}
              <span className={schemaIndexed ? 'text-[#3ECF8E] font-bold' : 'text-slate-500'}>
                {schemaIndexed ? 'Indexed' : 'Not Synced'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Tables indexed:</span>{' '}
              <span className="text-[#F3F1EA] font-bold">{tablesIndexed}</span>
            </div>
          </div>
        </div>

        {/* 2. Query History Card */}
        <div className="bg-[#161A22] border border-[#2A303C] rounded p-4 flex-1 flex flex-col min-h-0 text-left">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <span>📜</span> query history
            </h3>
            <button
              id="btn-refresh-history"
              onClick={loadHistory}
              disabled={historyLoading}
              className="text-[9px] text-[#4FD1C5] hover:text-[#4FD1C5]/85 font-semibold disabled:opacity-50"
            >
              {historyLoading ? '...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1 scrollbar-thin font-mono-code text-[10px]">
            {history.length === 0 ? (
              <p className="text-[9px] text-slate-500 text-center py-12">No previous queries</p>
            ) : (
              history.map((item: any) => (
                <div
                  key={item.id}
                  className="border border-[#2A303C] bg-[#0E1116]/40 hover:bg-[#0E1116] rounded p-2 transition-colors cursor-pointer text-left"
                  onClick={() => setQuestion(item.question)}
                >
                  <p className="text-[10px] text-slate-300 font-bold truncate mb-1" title={item.question}>
                    {item.question}
                  </p>
                  <div className="flex flex-col gap-1 text-[8px] font-semibold text-slate-500 border-t border-[#2A303C]/30 pt-1 mt-1">
                    <div className="flex justify-between">
                      <span>mode: <span className="text-slate-400">{item.mode === 'generate' ? 'f1_only' : 'f2_run'}</span></span>
                      <span>format: <span className="text-slate-400">{getFormatFromQuestion(item.question)}</span></span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={`px-1 rounded ${
                        item.status === 'success'
                          ? 'text-[#3ECF8E] bg-[#3ECF8E]/10 border border-[#3ECF8E]/20'
                          : item.status === 'unsafe'
                          ? 'text-[#EC5F5B] bg-[#EC5F5B]/10 border border-[#EC5F5B]/20'
                          : 'text-[#F5B942] bg-[#F5B942]/10 border border-[#F5B942]/20'
                      }`}>
                        {item.status}
                      </span>
                      <span className="font-medium text-[8px]">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Inline Security Guardrails */}
      <div className="pt-4 border-t border-[#2A303C] flex flex-wrap gap-x-3 gap-y-1 justify-center text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <span className="text-[#3ECF8E]">✓</span> SELECT-only
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[#3ECF8E]">✓</span> LIMIT Enforced
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[#3ECF8E]">✓</span> Read-only
        </span>
      </div>
    </aside>
  );
};
