import React, { useState } from 'react';

interface QueryConsoleProps {
  onSubmit: (question: string, mode: 'generate' | 'execute') => void;
  isLoading: boolean;
}

const SUGGESTIONS = [
  'Show top 10 records from the first table',
  'How many rows are in each table?',
  'Show row count by category as bar chart',
  'Summarize the data distribution in text',
  'Generate a report on the most recent records',
  'Analyze the overall data structure'
];

export const QueryConsole: React.FC<QueryConsoleProps> = ({ onSubmit, isLoading }) => {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'generate' | 'execute'>('generate');

  const handleSubmit = () => {
    if (question.trim() && !isLoading) {
      onSubmit(question.trim(), mode);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setQuestion(suggestion);
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Execution Mode Console</h2>
      
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('generate')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'generate'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Function 1: Generate SQL
        </button>
        <button
          onClick={() => setMode('execute')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'execute'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Function 2: Generate & Execute
        </button>
      </div>
      
      {/* Query Input */}
      <div className="mb-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a natural language question over your connected PostgreSQL database..."
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
          Ask normally, or request an output format: <strong>as table</strong>, <strong>as bar graph</strong>, <strong>as pie chart</strong>, <strong>as text</strong>, <strong>as report</strong>, or <strong>with analysis</strong>.
        </p>
      </div>
      
      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!question.trim() || isLoading}
        className={`w-full px-6 py-3 rounded-md font-medium transition-colors ${
          mode === 'generate'
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        } disabled:bg-gray-300 disabled:cursor-not-allowed`}
      >
        {isLoading ? 'Processing...' : mode === 'generate' ? 'Generate SQL' : 'Generate & Execute'}
      </button>
      
      {/* Suggestion Chips */}
      <div className="mt-4">
        <p className="text-sm text-gray-600 mb-2">Suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestion(suggestion)}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
