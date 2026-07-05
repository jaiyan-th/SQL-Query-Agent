import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ConnectionStatus } from '../components/ConnectionStatus';

export const HomePage: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [databaseType, setDatabaseType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const response = await apiClient.testConnection();
      setConnected(response.connected);
      setDatabaseType(response.database_type || '');
    } catch (error) {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleIngestSchema = async () => {
    if (!window.confirm('This will re-index the database schema. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.ingestSchema();
      alert('Schema ingested successfully!');
    } catch (error) {
      alert(`Schema ingestion failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            QueryGen AI 🚀
          </h1>
          <p className="text-xl text-gray-700 mb-6">
            Schema-Aware RAG-Powered Natural Language to SQL Agent
          </p>
          <div className="flex justify-center">
            <ConnectionStatus
              connected={connected}
              databaseType={databaseType}
              loading={loading}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/generate"
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-2 border-blue-200 hover:border-blue-400"
          >
            <h2 className="text-2xl font-bold text-blue-600 mb-3">
              📝 Generate Query
            </h2>
            <p className="text-gray-600">
              Generate SQL from natural language without executing.
              Perfect for review and validation.
            </p>
          </Link>

          <Link
            to="/execute"
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-2 border-green-200 hover:border-green-400"
          >
            <h2 className="text-2xl font-bold text-green-600 mb-3">
              ⚡ Generate & Execute
            </h2>
            <p className="text-gray-600">
              Generate SQL and execute it safely on your database.
              View results instantly.
            </p>
          </Link>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Key Features
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li>✅ Schema-aware RAG retrieval with Qdrant</li>
            <li>✅ Multi-tiered SQL security guardrails</li>
            <li>✅ Self-correcting execution loop</li>
            <li>✅ Groq LLM with Gemini fallback</li>
            <li>✅ Automatic LIMIT injection for safety</li>
            <li>✅ Query history tracking</li>
          </ul>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={handleIngestSchema}
            disabled={!connected || loading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Ingest Schema
          </button>
          <Link
            to="/history"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            View History
          </Link>
        </div>
      </div>
    </div>
  );
};
