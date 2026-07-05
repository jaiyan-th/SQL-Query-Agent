import React from 'react';
import { Table } from 'lucide-react';

interface ResultTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs?: number | null;
}

export const ResultTable: React.FC<ResultTableProps> = ({
  columns,
  rows,
  rowCount,
  executionTimeMs,
}) => {
  return (
    <div className="flex flex-col gap-3 text-left">
      {/* Title Header with Speed Metrics */}
      <div className="flex items-center justify-between">
        <h4 className="font-mono-code text-[10px] text-[#7E8A99] uppercase tracking-wider flex items-center gap-1.5">
          <Table size={12} className="text-[#53D6CC]" />
          <span>Execution Dataset</span>
        </h4>
        <span className="font-mono-code text-[10px] text-[#3ECF8E] font-bold bg-[#3ECF8E]/5 border border-[#3ECF8E]/20 px-2 py-0.5 rounded">
          {rowCount} rows fetched · {executionTimeMs?.toFixed(1) || '0.0'} ms latency
        </span>
      </div>

      {/* Grid Scroll Area */}
      <div className="bg-[#0B0F15] border border-[#252B36] rounded-[4px] overflow-hidden overflow-x-auto max-h-80 scrollbar-thin">
        <table className="w-full border-collapse font-mono-code text-xs">
          <thead>
            <tr className="border-b border-[#252B36] bg-[#151922]">
              {columns.map((col, idx) => (
                <th key={idx} className="px-4 py-3 text-left text-[#53D6CC] font-bold uppercase tracking-wider border-r border-[#252B36]/60 last:border-r-0">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length || 1} className="px-4 py-8 text-center text-[#7E8A99] italic">
                  No records returned.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-[#252B36]/40 hover:bg-[#151922]/30 last:border-b-0">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-4 py-2.5 text-[#E6E8EF] border-r border-[#252B36]/30 last:border-r-0 max-w-xs truncate">
                      {row[col] === null || row[col] === undefined ? (
                        <span className="text-[#7E8A99] italic font-normal">null</span>
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
