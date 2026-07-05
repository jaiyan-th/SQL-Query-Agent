import React from 'react';
import { SchemaContext } from '../api/client';

interface SchemaContextPanelProps {
  contexts: SchemaContext[];
}

export const SchemaContextPanel: React.FC<SchemaContextPanelProps> = ({ contexts }) => {
  if (contexts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Schema Context Used</h3>
      <div className="space-y-3">
        {contexts.map((ctx, idx) => (
          <div key={idx} className="bg-white p-3 rounded border border-gray-300">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-blue-600">{ctx.table_name}</span>
              <span className="text-sm text-gray-500">
                Relevance: {(ctx.relevance_score * 100).toFixed(0)}%
              </span>
            </div>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {ctx.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};
