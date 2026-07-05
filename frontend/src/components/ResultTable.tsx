import React from 'react';

interface ResultTableProps {
  columns: string[];
  rows: any[][];
  rowCount: number;
}

export const ResultTable: React.FC<ResultTableProps> = ({ columns, rows, rowCount }) => {
  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="text-center font-mono-code text-xs text-slate-500 py-8">
        No results to display
      </div>
    );
  }

  return (
    <div className="w-full text-left font-mono-code text-xs">
      <div className="mb-3 text-slate-500 font-bold">
        -- showing {rowCount} record{rowCount !== 1 ? 's' : ''}
      </div>
      <div className="overflow-x-auto border border-[#2A303C] rounded">
        <table className="min-w-full divide-y divide-[#2A303C]">
          <thead className="bg-[#0E1116]">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-2.5 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-[#2A303C] last:border-r-0"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A303C] bg-[#161A22]/20">
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-[#0E1116] transition-colors">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-2 whitespace-nowrap text-[#F3F1EA] border-r border-[#2A303C] last:border-r-0">
                    {cell !== null && cell !== undefined ? String(cell) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
