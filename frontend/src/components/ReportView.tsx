import React from 'react';

interface ReportViewProps {
  report: string;
}

export const ReportView: React.FC<ReportViewProps> = ({ report }) => {
  if (!report) {
    return (
      <div className="text-center font-mono-code text-xs text-slate-500 py-8">
        No report available.
      </div>
    );
  }

  // Basic markdown parser for report structure
  const lines = report.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  lines.forEach((line, idx) => {
    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        renderedElements.push(
          <pre key={`code-${idx}`} className="bg-[#161A22] text-[#4FD1C5] border border-[#2A303C] p-4 rounded overflow-x-auto my-3 text-[11px] font-mono leading-relaxed">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    // Title H1
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h2 key={idx} className="text-lg font-bold text-[#8B7CF6] mt-6 mb-3 border-b border-[#2A303C] pb-2 font-mono-code">
          # {trimmed.slice(2)}
        </h2>
      );
    }
    // Section H2
    else if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h3 key={idx} className="text-sm font-bold text-[#F3F1EA] mt-5 mb-2 font-mono-code">
          ## {trimmed.slice(3)}
        </h3>
      );
    }
    // Section H3
    else if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h4 key={idx} className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-4 mb-2 font-mono-code">
          ### {trimmed.slice(4)}
        </h4>
      );
    }
    // Blockquote
    else if (trimmed.startsWith('> ')) {
      renderedElements.push(
        <blockquote key={idx} className="border-l-2 border-[#4FD1C5] bg-[#161A22]/50 pl-4 py-2 pr-2 text-xs text-slate-300 italic my-2 font-mono-code">
          {trimmed.slice(2)}
        </blockquote>
      );
    }
    // Bullet List Item
    else if (trimmed.startsWith('- ')) {
      // Inline bold parsing **text** -> <strong>text</strong>
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
      // Inline bold parsing
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
    <div className="w-full bg-[#0E1116] border border-[#2A303C] rounded p-6 shadow max-w-4xl mx-auto space-y-2 text-left">
      <div className="flex justify-between items-center border-b border-[#2A303C] pb-4 mb-4 font-mono-code text-[10px]">
        <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-[#8B7CF6]/15 text-[#8B7CF6] border border-[#8B7CF6]/30">
          Executive Report
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(report);
            alert('Report copied to clipboard!');
          }}
          className="text-slate-400 hover:text-[#F3F1EA] font-bold"
        >
          Copy Markdown Report
        </button>
      </div>
      <div className="prose prose-sm max-w-none">
        {renderedElements}
      </div>
    </div>
  );
};
