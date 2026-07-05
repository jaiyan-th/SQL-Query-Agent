import React, { useState } from 'react';
import { Network, ChevronDown, ChevronUp } from 'lucide-react';
import { type SchemaContext } from '../../services/api';

interface RagProps {
  contexts: SchemaContext[];
  loading?: boolean;
}

export const RagContextPanel: React.FC<RagProps> = ({ contexts, loading }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-5 text-left flex flex-col gap-4 font-sans-ui">
      <div>
        <h4 className="text-xs font-bold text-[#E6E8EF] uppercase tracking-wider flex items-center gap-2">
          <Network size={14} className="text-[#53D6CC]" />
          <span>RAG Schema Retriever</span>
        </h4>
        <p className="text-[10px] text-[#7E8A99] mt-1 leading-normal font-semibold">
          Grounded schema context retrieved from Qdrant.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
        {loading ? (
          <div className="text-center py-6 font-mono-code text-xs text-[#7E8A99] animate-pulse">
            Retrieving matching schema context...
          </div>
        ) : contexts.length === 0 ? (
          <div className="text-center py-6 font-mono-code text-xs text-[#7E8A99] italic">
            No active schema context loaded.
          </div>
        ) : (
          contexts.map((ctx, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={idx} 
                className="border border-[#252B36] rounded bg-[#10141B] overflow-hidden"
              >
                {/* Header Toggle */}
                <button
                  onClick={() => toggleOpen(idx)}
                  className="w-full px-3 py-2 flex items-center justify-between font-mono-code text-[11px] text-left hover:bg-[#151922] border-none bg-transparent cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[#53D6CC] font-bold">tb:</span>
                    <span className="text-[#E6E8EF] font-bold truncate max-w-[120px]">{ctx.table_name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[#8B7CF6] font-bold">score: {ctx.relevance_score}</span>
                    {isOpen ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
                  </div>
                </button>

                {/* Body Content */}
                {isOpen && (
                  <div className="border-t border-[#252B36]/60 p-3 bg-[#050505] font-mono-code text-[10px] text-[#B8C0CC] overflow-x-auto whitespace-pre">
                    {ctx.content}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default RagContextPanel;
