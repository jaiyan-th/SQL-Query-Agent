import React from 'react';

interface HeaderProps {
  backendOnline: boolean;
  databaseConnected: boolean;
  schemaIndexed: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  backendOnline,
  databaseConnected,
  schemaIndexed
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            QueryGen AI 🚀
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Schema-Aware RAG-Powered Natural Language to SQL Agent
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`status-pill ${backendOnline ? 'online' : 'offline'}`}>
            <div className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-green-600' : 'bg-red-600'}`}></div>
            FastAPI {backendOnline ? 'Online' : 'Offline'}
          </div>
          
          <div className={`status-pill ${databaseConnected ? 'connected' : 'offline'}`}>
            <div className={`w-2 h-2 rounded-full ${databaseConnected ? 'bg-blue-600' : 'bg-red-600'}`}></div>
            {databaseConnected ? 'PostgreSQL Connected' : 'DB Not Connected'}
          </div>
          
          <div className={`status-pill ${schemaIndexed ? 'connected' : 'offline'}`}>
            <div className={`w-2 h-2 rounded-full ${schemaIndexed ? 'bg-blue-600' : 'bg-red-600'}`}></div>
            {schemaIndexed ? 'Qdrant Indexed' : 'Schema Not Indexed'}
          </div>
        </div>
      </div>
    </header>
  );
};
