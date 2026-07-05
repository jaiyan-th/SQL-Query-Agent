import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, Settings, LogOut } from 'lucide-react';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    window.dispatchEvent(new CustomEvent('global-search', { detail: { query: val } }));
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="dashboard-topbar font-sans-ui select-none">
      {/* Left Navigation Links */}
      <div className="flex items-center gap-6">
        <span className="topbar-link flex items-center gap-1.5 cursor-default">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse" />
          <span className="text-[#3ECF8E] font-medium text-xs font-mono">Status</span>
        </span>
      </div>

      {/* Right Search & Profile Panel */}
      <div className="flex items-center gap-6">
        {/* Global Search Panel */}
        <div className="global-search">
          <Search size={14} className="text-[#7E8A99]" />
          <input 
            type="text" 
            placeholder="Global search..." 
            value={searchVal}
            onChange={handleSearchChange}
          />
        </div>

        {/* Action Icons */}
        <button className="text-[#B8C0CC] hover:text-[#E6E8EF] transition-colors border-none bg-transparent cursor-pointer p-1">
          <Bell size={18} />
        </button>
        <Link to="/dashboard/settings" className="text-[#B8C0CC] hover:text-[#E6E8EF] transition-colors p-1">
          <Settings size={18} />
        </Link>

        {/* User Avatar Pill Dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded bg-[#8B7CF6] hover:bg-[#9c8ff7] text-[#0E1116] font-bold flex items-center justify-center text-xs font-mono select-none cursor-pointer border-none transition-colors"
            >
              {getInitials(user.full_name)}
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-[6px] bg-[#151922] border border-[#252B36] shadow-xl py-2 z-50 text-left font-mono-code text-[11px]">
                <div className="px-4 py-2 border-b border-[#252B36]/50">
                  <p className="text-[#E6E8EF] font-bold font-sans-ui text-xs">{user.full_name}</p>
                  <p className="text-[#7E8A99] mt-0.5">{user.email}</p>
                  <p className="text-[#8B7CF6] mt-1 text-[9px] uppercase font-bold tracking-wider">{user.role}</p>
                </div>
                <Link 
                  to="/dashboard/settings" 
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-[#E6E8EF] hover:bg-[#252B36]/40 transition-colors decoration-none"
                >
                  <Settings size={12} className="text-[#53D6CC]" />
                  <span>User Settings</span>
                </Link>
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-[#EF5F5F] hover:bg-[#EF5F5F]/5 transition-colors border-none bg-transparent cursor-pointer text-left font-mono-code text-[11px]"
                >
                  <LogOut size={12} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

