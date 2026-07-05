import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface QueryResultProps {
  sql: string;
  explanation: string;
}

export const QueryResult: React.FC<QueryResultProps> = ({ sql, explanation }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSQL = (code: string) => {
    if (!code) return <span className="text-[#7E8A99]">-- No SQL generated</span>;

    const keywords = new Set([
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIMIT',
      'ORDER', 'BY', 'DESC', 'ASC', 'GROUP', 'HAVING', 'JOIN', 'LEFT', 'RIGHT',
      'INNER', 'ON', 'AS', 'WITH', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'BETWEEN', 'LIKE'
    ]);

    return code.split(/(\s+|\b)/).map((part, index) => {
      const upperWord = part.trim().toUpperCase();
      if (keywords.has(upperWord)) {
        return <span key={index} className="text-[#8B7CF6] font-bold">{part}</span>;
      }
      if (/^\d+$/.test(part.trim())) {
        return <span key={index} className="text-[#F5C26B]">{part}</span>;
      }
      if (/^'[^']*'$/.test(part.trim())) {
        return <span key={index} className="text-[#3ECF8E]">{part}</span>;
      }
      return <span key={index} className="text-[#E6E8EF]">{part}</span>;
    });
  };

  return (
    <div className="flex flex-col gap-5 text-left">
      {/* Generated SQL code block */}
      <div>
        <h4 className="font-mono-code text-[10px] text-[#7E8A99] uppercase tracking-wider mb-2">SQL_GENERATED</h4>
        <div className="sql-block-container">
          <button onClick={handleCopy} className="sql-copy-btn border-none" title="Copy SQL">
            {copied ? <Check size={14} className="text-[#3ECF8E]" /> : <Copy size={14} />}
          </button>
          <pre className="sql-block">
            <code>{renderSQL(sql)}</code>
          </pre>
        </div>
      </div>

      {/* Narrative Explanation */}
      {explanation && (
        <div className="bg-[#151922] border border-[#252B36] rounded p-4">
          <h4 className="font-mono-code text-[10px] text-[#7E8A99] uppercase tracking-wider mb-1.5">EXPLANATION</h4>
          <p className="text-xs text-[#B8C0CC] leading-relaxed">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
};
