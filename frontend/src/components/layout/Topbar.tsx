import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, Settings } from 'lucide-react';

export const Topbar: React.FC = () => {
  const { user } = useAuth();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="dashboard-topbar font-sans-ui select-none">
      {/* Left Navigation Links */}
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="text-[#E6E8EF] font-bold text-base hover:opacity-90 transition-opacity flex items-center gap-1 font-display">
          <span className="text-[#53D6CC]">&gt;_</span> QueryGen AI
        </Link>
        <span className="text-[#252B36] font-light">|</span>
        <div className="topbar-nav">
          <a href="/docs/API_DOCUMENTATION.md" target="_blank" rel="noopener noreferrer" className="topbar-link">
            Docs
          </a>
          <a href="/docs/API_DOCUMENTATION.md" target="_blank" rel="noopener noreferrer" className="topbar-link">
            API
          </a>
          <span className="topbar-link flex items-center gap-1.5 cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
            <span className="text-[#3ECF8E] font-medium text-xs font-mono">Status</span>
          </span>
        </div>
      </div>

      {/* Right Search & Profile Panel */}
      <div className="flex items-center gap-6">
        {/* Global Search Panel */}
        <div className="global-search">
          <Search size={14} className="text-[#7E8A99]" />
          <input type="text" placeholder="Global search..." disabled />
        </div>

        {/* Action Icons */}
        <button className="text-[#B8C0CC] hover:text-[#E6E8EF] transition-colors border-none bg-transparent cursor-pointer p-1">
          <Bell size={18} />
        </button>
        <Link to="/dashboard/settings" className="text-[#B8C0CC] hover:text-[#E6E8EF] transition-colors p-1">
          <Settings size={18} />
        </Link>

        {/* User Avatar Pill */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#8B7CF6] text-[#0E1116] font-bold flex items-center justify-center text-xs font-mono select-none">
              {getInitials(user.full_name)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
