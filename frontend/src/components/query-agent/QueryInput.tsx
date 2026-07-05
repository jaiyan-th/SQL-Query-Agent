import React, { useRef } from 'react';
import { Play, TerminalSquare } from 'lucide-react';

interface QueryInputProps {
  question: string;
  setQuestion: (q: string) => void;
  queryMode: 'generate' | 'execute';
  setQueryMode: (mode: 'generate' | 'execute') => void;
  onSubmit: () => void;
  loading: boolean;
  disabled: boolean;
}

export const QueryInput: React.FC<QueryInputProps> = ({
  question,
  setQuestion,
  queryMode,
  setQueryMode,
  onSubmit,
  loading,
  disabled,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (question.trim() && !loading && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <div className="terminal-card shadow-lg flex flex-col text-left">
      {/* Terminal Header */}
      <div className="terminal-header justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#53D6CC] animate-pulse" />
          <span className="text-[#B8C0CC] ml-1 font-bold">querygen_agent_shell</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Mode Selector Toggle */}
          <div className="flex bg-[#0E1116] border border-[#252B36] rounded p-0.5 select-none font-mono text-[10px]">
            <button
              onClick={() => setQueryMode('generate')}
              disabled={disabled}
              className={`px-2.5 py-1 rounded-sm font-bold border-none transition-all cursor-pointer ${
                queryMode === 'generate'
                  ? 'bg-[#8B7CF6]/20 text-[#8B7CF6]'
                  : 'bg-transparent text-[#7E8A99] hover:text-[#B8C0CC]'
              }`}
            >
              SQL Only
            </button>
            <button
              onClick={() => setQueryMode('execute')}
              disabled={disabled}
              className={`px-2.5 py-1 rounded-sm font-bold border-none transition-all cursor-pointer ${
                queryMode === 'execute'
                  ? 'bg-[#53D6CC]/20 text-[#53D6CC]'
                  : 'bg-transparent text-[#7E8A99] hover:text-[#B8C0CC]'
              }`}
            >
              SQL + Run
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative bg-[#0B0F15]">
        {disabled ? (
          <div className="min-h-[120px] flex items-center justify-center p-6 text-center text-[#7E8A99] font-mono-code text-xs bg-[#0B0F15]/90 border border-transparent">
            <span>Please upload and index a SQLite database file before asking questions.</span>
          </div>
        ) : (
          <div className="flex items-start bg-[#0B0F15] p-4">
            <span className="text-[#53D6CC] font-mono font-bold select-none mt-2.5 mr-2">&gt;</span>
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your SQLite database..."
              disabled={loading}
              className="terminal-input bg-transparent border-none p-2"
            />
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div className="border-t border-[#252B36] p-4 bg-[#151922] flex items-center justify-between">
        <span className="text-[10px] text-[#7E8A99] leading-normal font-mono">
          * Guardrails block write statement keywords (INSERT, DELETE, DROP, etc.) to keep query targets fully read-only.
        </span>
        <button
          onClick={onSubmit}
          disabled={!question.trim() || loading || disabled}
          className={`${queryMode === 'generate' ? 'bg-[#8B7CF6]/20 text-[#8B7CF6] border-[#8B7CF6]' : 'btn-primary'} border-none`}
        >
          {loading ? (
            <span>Processing...</span>
          ) : queryMode === 'generate' ? (
            <span className="flex items-center gap-1 px-4"><TerminalSquare size={14} /> Generate SQL</span>
          ) : (
            <span className="flex items-center gap-1 px-4"><Play size={14} /> Run Query</span>
          )}
        </button>
      </div>
    </div>
  );
};
