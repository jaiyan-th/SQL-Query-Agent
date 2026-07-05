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
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--bg-base)] text-[var(--text-primary)] select-none font-sans-ui">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Link to="/" className="flex items-center gap-2 mb-6 hover:opacity-90 transition-opacity">
          <h1 className="text-xl font-bold font-display text-[var(--text-primary)] tracking-tight flex items-center gap-1">
            <span className="text-[var(--cyan)] font-mono-code font-bold drop-shadow-[0_0_8px_rgba(83,214,204,0.6)]">&gt;_</span> QueryGen AI
          </h1>
        </Link>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* Terminal Chrome Window */}
        <div className="bg-[var(--bg-card)] rounded-[6px] border border-[var(--border-subtle)] shadow-[0_0_30px_rgba(139,124,246,0.08)] overflow-hidden">
          <div className="bg-[var(--bg-card-deep)] border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between font-mono-code text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--red)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]" />
              <span className="font-bold ml-2">{filename}</span>
            </div>
            <span className="font-bold">bash</span>
          </div>

          <div className="py-8 px-6 sm:px-10 text-left">
            <h2 className="text-xl font-bold font-mono-code text-[var(--text-primary)] mb-1.5">
              # {title}
            </h2>
            <p className="text-xs font-mono-code text-[var(--text-muted)] mb-6 leading-relaxed">
              -- {subtitle}
            </p>

            {children}
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-[10px] font-mono-code text-[var(--text-muted)] leading-normal font-semibold">
            -- Secure, RAG-grounded SELECT-only query access. Built for Database Intelligence.
          </p>
        </div>
      </div>
    </div>
  );
};
