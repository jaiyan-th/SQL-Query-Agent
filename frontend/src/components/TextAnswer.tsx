import React from 'react';

interface TextAnswerProps {
  text: string;
}

export const TextAnswer: React.FC<TextAnswerProps> = ({ text }) => {
  if (!text) {
    return (
      <div className="text-center font-mono-code text-xs text-slate-500 py-8">
        No summary response available.
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0E1116] border border-[#2A303C] rounded p-5 text-left font-mono-code text-xs">
      <div className="flex gap-3">
        <span className="text-[#8B7CF6] text-lg mt-0.5">💬</span>
        <div>
          <h4 className="font-bold text-[#8B7CF6] uppercase tracking-wider mb-2">Natural Language Summary</h4>
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    </div>
  );
};
