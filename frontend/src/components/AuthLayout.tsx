import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  filename: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, filename }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#0E1116] text-[#F3F1EA] select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        {/* Branding Logo */}
        <Link to="/" className="flex items-center gap-2 mb-6 hover:opacity-90 transition-opacity font-mono-code">
          <span className="text-xl">🚀</span>
          <span className="text-sm font-bold text-[#F3F1EA] tracking-tight">
            <span className="text-[#4FD1C5]">&gt;_</span> QueryGen AI
          </span>
        </Link>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* Terminal Chrome Window */}
        <div className="bg-[#161A22] rounded-[10px] border border-[#2A303C] shadow-[0_0_30px_rgba(139,124,246,0.12)] overflow-hidden">
          <div className="bg-[#1A1F29] border-b border-[#2A303C] px-4 py-3 flex items-center justify-between font-mono-code text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EC5F5B]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
              <span className="text-slate-500 font-bold ml-2">{filename}</span>
            </div>
            <span className="text-slate-500 font-bold">bash</span>
          </div>

          <div className="py-8 px-6 sm:px-10 text-left">
            <h2 className="text-lg font-bold font-mono-code text-[#F3F1EA] mb-1">
              # {title}
            </h2>
            <p className="text-[10px] font-mono-code text-slate-500 mb-6 leading-relaxed">
              -- {subtitle}
            </p>

            {children}
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-[9px] font-mono-code text-slate-600">
            -- Secure, RAG-grounded SELECT-only query access. Built for Database Intelligence.
          </p>
        </div>
      </div>
    </div>
  );
};
