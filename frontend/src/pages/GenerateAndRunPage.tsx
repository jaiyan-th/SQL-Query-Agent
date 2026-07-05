import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, GenerateAndRunResponse } from '../api/client';
import { QueryInput } from '../components/QueryInput';
import { SqlPreview } from '../components/SqlPreview';
import { ExplanationBox } from '../components/ExplanationBox';
import { ResultTable } from '../components/ResultTable';
import { SchemaContextPanel } from '../components/SchemaContextPanel';

export const GenerateAndRunPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<GenerateAndRunResponse | null>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (question: string) => {
    try {
      setLoading(true);
      setError('');
      setResponse(null);
      
      const result = await apiClient.generateAndRun({ question });
      setResponse(result);
      
      if (result.status === 'error') {
        setError(result.error_message || 'Query execution failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          ⚡ Generate & Execute SQL Query
        </h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <QueryInput
            onSubmit={handleSubmit}
            loading={loading}
            buttonText="Generate & Run"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {response && (
          <div className="space-y-6">
            <SqlPreview
              sql={response.sql}
              safetyStatus={response.safety_status}
            />
            
            <ExplanationBox explanation={response.explanation} />
            
            {response.status === 'success' && response.execution_status === 'executed' && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4">Query Results</h3>
                <ResultTable
                  columns={response.columns}
                  rows={response.rows}
                  rowCount={response.row_count}
                />
              </div>
            )}
            
            {response.execution_status === 'blocked' && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                🚫 Query was blocked by security guardrails.
              </div>
            )}
            
            <SchemaContextPanel contexts={response.schema_context} />
          </div>
        )}
      </div>
    </div>
  );
};
