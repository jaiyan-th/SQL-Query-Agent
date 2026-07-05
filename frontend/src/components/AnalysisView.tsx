import React from 'react';

interface AnalysisViewProps {
  analysis: string;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="text-center font-mono-code text-xs text-slate-500 py-8">
        No analysis details available.
      </div>
    );
  }

  const lines = analysis.split('\n');
  const renderedElements: React.ReactNode[] = [];
  const metrics: { label: string; value: string }[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Detect metric bullets in analysis, e.g. "**Total Rows Returned**: 5"
    if (trimmed.startsWith('- **') && trimmed.includes('**:')) {
      const parts = trimmed.slice(2).split('**:');
      if (parts.length >= 2) {
        const label = parts[0].replace(/\*\*/g, '').trim();
        const value = parts[1].replace(/`/g, '').trim();
        metrics.push({ label, value });
        return;
      }
    }

    // Heading 1
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h2 key={idx} className="text-sm font-bold text-[#8B7CF6] mt-5 mb-3 border-b border-[#2A303C] pb-2 flex items-center gap-2 font-mono-code">
          <span>📊</span>
          # {trimmed.slice(2)}
        </h2>
      );
    }
    // Heading 3
    else if (trimmed.startsWith('### ')) {
      const headingText = trimmed.slice(4);
      let bgStyle = "bg-[#161A22] text-[#F3F1EA] border border-[#2A303C]";
      if (headingText.toLowerCase().includes("caution") || headingText.toLowerCase().includes("limit")) {
        bgStyle = "bg-[#F5B942]/10 text-[#F5B942] border border-[#F5B942]/30";
      } else if (headingText.toLowerCase().includes("observation")) {
        bgStyle = "bg-[#4FD1C5]/10 text-[#4FD1C5] border border-[#4FD1C5]/30";
      }
      
      renderedElements.push(
        <h3 key={idx} className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-4 mb-2 font-mono-code ${bgStyle}`}>
          {headingText}
        </h3>
      );
    }
    // Bullet
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2);
      const boldParts = content.split('**');
      const parsedContent = boldParts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} className="font-bold text-[#F3F1EA]">{part}</strong>;
        }
        return part;
      });

      renderedElements.push(
        <li key={idx} className="ml-5 list-disc text-xs text-slate-400 py-1 font-mono-code">
          {parsedContent}
        </li>
      );
    }
    // Paragraph
    else {
      const boldParts = trimmed.split('**');
      const parsedContent = boldParts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} className="font-bold text-[#F3F1EA]">{part}</strong>;
        }
        return part;
      });

      renderedElements.push(
        <p key={idx} className="text-xs text-slate-300 leading-relaxed my-2 font-mono-code">
          {parsedContent}
        </p>
      );
    }
  });

  return (
    <div className="w-full bg-[#0E1116] border border-[#2A303C] rounded p-6 shadow max-w-4xl mx-auto space-y-4 text-left">
      {/* Metrics Summary Cards */}
      {metrics.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-500 mb-3">Key Analytical Metrics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.map((m, idx) => (
              <div key={idx} className="bg-[#161A22] border border-[#2A303C] rounded p-4 shadow flex flex-col justify-between font-mono-code text-left">
                <span className="text-[9px] font-bold text-[#4FD1C5] uppercase tracking-wider">{m.label}</span>
                <span className="text-base font-bold text-[#F3F1EA] mt-2 truncate" title={m.value}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Analysis Body */}
      <div className="prose prose-sm max-w-none pt-2">
        {renderedElements}
      </div>
    </div>
  );
};
