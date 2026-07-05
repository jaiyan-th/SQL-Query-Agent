import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getRoleColor = (roleName: string) => {
    const r = roleName.toLowerCase();
    if (r.includes('student')) return '#4FD1C5';      // Schema Cyan
    if (r.includes('developer')) return '#8B7CF6';    // Query Violet
    if (r.includes('admin')) return '#F5B942';        // Guardrail Amber
    if (r.includes('analyst')) return '#3ECF8E';      // Safe Signal Green
    return '#8B7CF6';
  };

  const formatSessionName = (name: string) => {
    return name.toLowerCase().trim().replace(/\s+/g, '_');
  };

  return (
    <header className="bg-[#161A22] border-b border-[#2A303C] px-6 py-4 sticky top-0 z-40 flex items-center justify-between shadow-md font-sans-ui">
      {/* 1. Brand Wordmark (Tier 1: Display / Space Grotesk) */}
      <div className="flex items-center gap-2">
        <h1 
          title="QueryGen AI — RAG-Powered Natural Language to SQL Query Agent"
          className="text-2xl font-extrabold font-display text-[#F3F1EA] tracking-tight flex items-center gap-1 select-none cursor-help"
        >
          <span className="text-[#4FD1C5] font-mono-code font-bold drop-shadow-[0_0_12px_rgba(79,209,197,0.85)]">&gt;_</span> QueryGen AI
        </h1>
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-[#8B7CF6]/10 text-[#8B7CF6] border border-[#8B7CF6]/30 ml-2">
          Console
        </span>
      </div>

      {/* 2. Compact Session Card Dropdown */}
      <div className="relative" ref={dropdownRef}>
        {user && (
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-[#0E1116] border border-[#2A303C] hover:border-slate-500 rounded font-mono-code text-[11px] text-slate-300 transition-all shadow-inner"
          >
            <span>[ session:</span>
            <span className="text-[#F3F1EA] font-semibold">{formatSessionName(user.full_name)}</span>
            <span>]</span>
            <span
              className="w-1.5 h-1.5 rounded-full ml-1"
              style={{ backgroundColor: getRoleColor(user.role) }}
            />
          </button>
        )}

        {/* Expanded Session Terminal Dropdown */}
        {dropdownOpen && user && (
          <div className="absolute right-0 mt-3 w-64 bg-[#161A22] border border-[#2A303C] rounded-[10px] shadow-[0_4px_25px_rgba(0,0,0,0.5)] overflow-hidden z-50">
            {/* Terminal Chrome header */}
            <div className="bg-[#1A1F29] border-b border-[#2A303C] px-3 py-2 flex items-center justify-between font-mono-code text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EC5F5B]" />
                <span className="w-2 h-2 rounded-full bg-[#F5B942]" />
                <span className="w-2 h-2 rounded-full bg-[#3ECF8E]" />
                <span className="ml-1.5 font-bold">whoami.sh</span>
              </div>
              <span>bash</span>
            </div>

            {/* Terminal body */}
            <div className="p-4 text-left font-mono-code text-[11px] space-y-2 text-slate-400">
              <div className="text-slate-500 select-none">$ whoami</div>
              <div className="pl-3 space-y-1">
                <div>
                  <span className="text-slate-500">user:</span>{' '}
                  <span className="text-[#F3F1EA] font-bold">{user.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-500">role:</span>{' '}
                  <span className="font-bold" style={{ color: getRoleColor(user.role) }}>
                    {user.role.toLowerCase()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">session:</span>{' '}
                  <span className="text-[#3ECF8E] font-bold">active</span>
                </div>
              </div>
              <div className="border-t border-[#2A303C] pt-2 mt-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left font-bold text-[#EC5F5B] hover:text-[#EC5F5B]/85 transition-colors pl-3 py-1 flex items-center gap-1"
                >
                  <span className="text-[#EC5F5B]/60">&gt;</span> Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
