import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onUploadClick?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, onUploadClick }) => {
  return (
    <div className="dashboard-shell">
      <Sidebar onUploadClick={onUploadClick} />
      <div className="dashboard-main">
        <Topbar />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
