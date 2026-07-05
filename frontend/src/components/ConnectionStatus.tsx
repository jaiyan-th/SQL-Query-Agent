import React from 'react';

interface ConnectionStatusProps {
  connected: boolean;
  databaseType?: string;
  loading?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connected,
  databaseType,
  loading
}) => {
  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
        <span>Checking connection...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${connected ? 'text-green-600' : 'text-red-600'}`}>
      <div className={`w-3 h-3 ${connected ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
      <span>
        {connected
          ? `Connected to ${databaseType || 'database'}`
          : 'Not connected to database'}
      </span>
    </div>
  );
};
