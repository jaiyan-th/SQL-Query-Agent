import React from 'react';

interface SqlPreviewProps {
  sql: string;
  safetyStatus?: string;
}

export const SqlPreview: React.FC<SqlPreviewProps> = ({ sql, safetyStatus }) => {
  const getSafetyColor = () => {
    switch (safetyStatus) {
      case 'safe':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'unsafe':
        return 'bg-red-100 border-red-500 text-red-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Generated SQL</h3>
        {safetyStatus && (
          <span className={`px-3 py-1 rounded text-sm ${getSafetyColor()}`}>
            {safetyStatus.toUpperCase()}
          </span>
        )}
      </div>
      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
        <code>{sql}</code>
      </pre>
    </div>
  );
};
