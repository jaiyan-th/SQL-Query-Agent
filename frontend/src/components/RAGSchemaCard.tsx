import React from 'react';

interface RAGSchemaCardProps {
  onIngest: () => void;
  tablesIndexed: number;
  lastSynced: string | null;
  isIndexed: boolean;
  isLoading: boolean;
}

export const RAGSchemaCard: React.FC<RAGSchemaCardProps> = ({
  onIngest,
  tablesIndexed,
  lastSynced,
  isIndexed,
  isLoading
}) => {
  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">RAG Schema Index</h3>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-600">Vector DB</p>
            <p className="font-medium text-gray-900">Qdrant</p>
          </div>
          <div>
            <p className="text-gray-600">Indexed Tables</p>
            <p className="font-medium text-gray-900">{tablesIndexed}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-600">Last Synced</p>
            <p className="font-medium text-gray-900 text-xs">
              {lastSynced || 'Never'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-600">Status</p>
            <p className={`font-medium ${isIndexed ? 'text-green-600' : 'text-gray-400'}`}>
              {isIndexed ? 'Indexed' : 'Not Indexed'}
            </p>
          </div>
        </div>
        
        <button
          onClick={onIngest}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {isLoading ? 'Ingesting...' : isIndexed ? 'Re-Ingest Schema' : 'Ingest Schema'}
        </button>
      </div>
    </div>
  );
};
