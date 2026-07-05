import React, { useState } from 'react';

interface DatabaseConnectionCardProps {
  onTest: (url: string) => Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
}

export const DatabaseConnectionCard: React.FC<DatabaseConnectionCardProps> = ({
  onTest,
  isConnected,
  isLoading
}) => {
  const [dbUrl, setDbUrl] = useState('');

  const handleTest = () => {
    if (dbUrl.trim()) {
      onTest(dbUrl);
    }
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Connection</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PostgreSQL Connection URL
          </label>
          <input
            type="text"
            value={dbUrl}
            onChange={(e) => setDbUrl(e.target.value)}
            placeholder="postgresql://username:password@host:5432/database_name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Database credentials are stored only on the backend. Use a read-only DB user for production.
          </p>

        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={!dbUrl.trim() || isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isLoading ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleTest}
            disabled={!dbUrl.trim() || isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Save Connection
          </button>
        </div>
        
        {isConnected && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-900">PostgreSQL Connection Active</p>
                <p className="text-xs text-green-700 mt-1">
                  Connected successfully using read-only execution mode.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
