import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, GenerateQueryResponse } from '../api/client';
import { QueryInput } from '../components/QueryInput';
import { SqlPreview } from '../components/SqlPreview';
import { ExplanationBox } from '../components/ExplanationBox';
import { SchemaContextPanel } from '../components/SchemaContextPanel';

export const GenerateQueryPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<GenerateQueryResponse | null>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (question: string) => {
    try {
      setLoading(true);
      setError('');
      setResponse(null);
      
      const result = await apiClient.generateQuery({ question });
      setResponse(result);
      
      if (result.needs_clarification) {
        setError(result.clarification_question || 'Query needs clarification');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate query');
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
          📝 Generate SQL Query
        </h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <QueryInput
            onSubmit={handleSubmit}
            loading={loading}
            buttonText="Generate SQL"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {response && response.status === 'success' && (
          <div className="space-y-6">
            <SqlPreview
              sql={response.sql}
              safetyStatus={response.safety_status}
            />
            
            <ExplanationBox
              explanation={response.explanation}
              tablesUsed={response.tables_used}
              confidence={response.confidence}
            />
            
            <SchemaContextPanel contexts={response.schema_context} />
            
            {response.safety_status === 'unsafe' && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                ⚠️ This query was marked as unsafe and cannot be executed.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
