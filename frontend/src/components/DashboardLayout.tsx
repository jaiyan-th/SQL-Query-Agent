import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
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
    const r = roleName ? roleName.toLowerCase() : '';
    if (r.includes('student')) return '#4FD1C5';      // Schema Cyan
    if (r.includes('developer')) return '#8B7CF6';    // Query Violet
    if (r.includes('admin')) return '#F5B942';        // Guardrail Amber
    if (r.includes('analyst')) return '#3ECF8E';      // Safe Signal Green
    return '#8B7CF6';
  };

  const formatSessionName = (name: string) => {
    return name ? name.toLowerCase().trim().replace(/\s+/g, '_') : 'guest';
  };

  const menuItems = [
    { name: 'Query Agent', path: '/dashboard/query-agent', icon: '⚡' },
    { name: 'Setup', path: '/dashboard/setup', icon: '🔌' },
    { name: 'SQL Agent', path: '/dashboard/agent', icon: '🤖' },
    { name: 'Query History', path: '/dashboard/history', icon: '📜' },
  ];

  return (
    <div className="min-h-screen bg-[#0E1116] text-[#F3F1EA] flex flex-col font-sans-ui select-none">
      {/* Shared Header Navigation */}
      <header className="bg-[#161A22] border-b border-[#2A303C] px-6 py-4 sticky top-0 z-40 flex items-center justify-between shadow-md font-sans-ui flex-shrink-0">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <h1 
              title="QueryGen AI — RAG-Powered Natural Language to SQL Query Agent"
              className="text-2xl font-extrabold font-display text-[#F3F1EA] tracking-tight flex items-center gap-1 select-none cursor-help"
            >
              <span className="text-[#4FD1C5] font-mono-code font-bold drop-shadow-[0_0_12px_rgba(79,209,197,0.85)]">&gt;_</span> QueryGen AI
            </h1>
          </Link>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-[#8B7CF6]/10 text-[#8B7CF6] border border-[#8B7CF6]/30 ml-2">
            Workspace
          </span>
        </div>

        {/* User Session Dropdown */}
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

          {dropdownOpen && user && (
            <div className="absolute right-0 mt-2 w-52 rounded border border-[#2A303C] bg-[#161A22] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden z-50">
              <div className="bg-[#1A1F29] border-b border-[#2A303C] px-3 py-1.5 flex items-center gap-1.5 font-mono-code text-[10px] text-slate-500 select-none">
                <span className="w-2 h-2 rounded-full bg-[#EC5F5B]" />
                <span className="w-2 h-2 rounded-full bg-[#F5B942]" />
                <span className="w-2 h-2 rounded-full bg-[#3ECF8E]" />
                <span className="ml-1 font-bold">whoami.sh</span>
              </div>
              <div className="p-4 font-mono-code text-[11px] space-y-2 select-text text-left">
                <div className="text-slate-500">
                  $ whoami
                  <div className="text-[#F3F1EA] font-semibold mt-0.5">{user.full_name}</div>
                </div>
                <div className="text-slate-500 border-t border-[#2A303C]/30 pt-2">
                  $ printenv ROLE
                  <div className="text-[#8B7CF6] font-semibold mt-0.5 uppercase tracking-wider">{user.role}</div>
                </div>
                <div className="text-slate-500 border-t border-[#2A303C]/30 pt-2 select-none">
                  $ session --status
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
                    <span className="text-[#3ECF8E] font-semibold">active · connected</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-[#2A303C] bg-[#1A1F29] px-3 py-2 flex justify-start">
                <button
                  onClick={handleLogout}
                  className="text-[10px] font-mono-code font-bold text-[#EC5F5B] hover:text-red-400 transition-colors"
                >
                  &gt; Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace with Left Sidebar Navigation */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 p-6 flex flex-col justify-between border-r border-[#2A303C] bg-[#161A22] select-none font-sans-ui flex-shrink-0">
          <div className="flex flex-col gap-6">
            <div className="text-left">
              <h3 className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Navigation
              </h3>
              <nav className="mt-4 space-y-1">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#8B7CF6]/15 text-[#8B7CF6] border-l-2 border-[#8B7CF6]'
                          : 'text-slate-400 hover:text-[#F3F1EA] hover:bg-[#1A1F29]'
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="border-t border-[#2A303C] pt-4 text-left">
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono-code uppercase font-semibold tracking-wider">
              <span>SQL guardrails</span>
              <span className="text-[#3ECF8E] font-bold">active</span>
            </div>
          </div>
        </aside>

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 70px)' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
