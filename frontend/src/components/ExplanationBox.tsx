import React from 'react';

interface ExplanationBoxProps {
  explanation: string;
  tablesUsed?: string[];
  confidence?: number;
}

export const ExplanationBox: React.FC<ExplanationBoxProps> = ({
  explanation,
  tablesUsed,
  confidence
}) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-2">Explanation</h3>
      <p className="text-gray-700 mb-3">{explanation}</p>
      
      {tablesUsed && tablesUsed.length > 0 && (
        <div className="mb-2">
          <span className="font-medium">Tables Used: </span>
          <span className="text-gray-700">{tablesUsed.join(', ')}</span>
        </div>
      )}
      
      {confidence !== undefined && (
        <div>
          <span className="font-medium">Confidence: </span>
          <span className="text-gray-700">{(confidence * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};
