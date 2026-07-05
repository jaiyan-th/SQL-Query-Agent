import React from 'react';
import { QueryHistoryItem } from '../api/client';

interface QueryHistoryCardProps {
  history: QueryHistoryItem[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const QueryHistoryCard: React.FC<QueryHistoryCardProps> = ({
  history,
  onRefresh,
  isLoading
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getModeColor = (mode: string) => {
    return mode === 'execute' ? 'text-green-700 bg-green-50' : 'text-blue-700 bg-blue-50';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-700';
      case 'error':
      case 'failed':
        return 'text-red-700';
      default:
        return 'text-yellow-700';
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Query History</h3>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No queries yet</p>
        ) : (
          history.slice(0, 10).map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors">
              <p className="text-sm text-gray-900 font-medium truncate mb-1">
                {item.question}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded ${getModeColor(item.mode)}`}>
                  {item.mode === 'execute' ? 'Generate & Execute' : 'Generate SQL'}
                </span>
                <span className={`font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
                <span className="text-gray-500">{formatTime(item.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
