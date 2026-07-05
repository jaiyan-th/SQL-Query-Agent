import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  TerminalSquare, 
  History, 
  Database, 
  Settings, 
  BookOpen, 
  LogOut, 
  Upload 
} from 'lucide-react';

interface SidebarProps {
  onUploadClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onUploadClick }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePrimaryClick = () => {
    navigate('/dashboard/query-agent');
    if (onUploadClick) {
      onUploadClick();
    }
  };

  return (
    <aside className="dashboard-sidebar font-sans-ui select-none">
      <div>
        {/* Top Logo Brand Area */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <TerminalSquare size={22} />
          </div>
          <div className="text-left">
            <div className="brand-title">SQL_AGENT_v1</div>
            <div className="brand-subtitle">SQLite Workspace</div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button className="sidebar-primary-button w-[212px]" onClick={handlePrimaryClick}>
          <Upload size={16} />
          <span>Upload SQLite</span>
        </button>

        {/* Navigation Items */}
        <nav className="sidebar-navigation">
          <NavLink 
            to="/dashboard/query-agent" 
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <TerminalSquare size={18} />
            <span>Query Agent</span>
          </NavLink>
          <NavLink 
            to="/dashboard/history" 
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <History size={18} />
            <span>History</span>
          </NavLink>
          <NavLink 
            to="/dashboard/schema" 
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Database size={18} />
            <span>Schema Browser</span>
          </NavLink>
          <NavLink 
            to="/dashboard/settings" 
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Settings size={18} />
            <span>User Settings</span>
          </NavLink>
        </nav>
      </div>

      {/* Bottom Footer Items */}
      <div className="sidebar-footer">
        <a 
          href="/docs/API_DOCUMENTATION.md" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="sidebar-footer-item"
        >
          <BookOpen size={16} />
          <span>Documentation</span>
        </a>
        <button 
          onClick={handleLogout} 
          className="sidebar-footer-item danger border-none bg-transparent w-full text-left cursor-pointer"
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
