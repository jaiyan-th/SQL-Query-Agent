import React from 'react';

interface GuardrailsPanelProps {
  safetyStatus: string;
}

export const GuardrailsPanel: React.FC<GuardrailsPanelProps> = ({ safetyStatus }) => {
  const isSafe = safetyStatus === 'safe';

  const checks = [
    {
      name: 'SELECT-only validation',
      passed: isSafe,
      description: 'Only SELECT and WITH...SELECT queries allowed'
    },
    {
      name: 'Dangerous keyword check',
      passed: isSafe,
      description: 'Blocked: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, MERGE, GRANT, REVOKE'
    },
    {
      name: 'Multi-statement check',
      passed: isSafe,
      description: 'Semicolon-separated queries blocked'
    },
    {
      name: 'LIMIT injection status',
      passed: true,
      description: 'Automatic LIMIT 50 added, MAX_ROWS 100 enforced'
    },
    {
      name: 'Read-only execution mode',
      passed: true,
      description: 'ALLOW_WRITE=false enforced on backend'
    }
  ];

  return (
    <div className="space-y-4 font-mono-code text-xs text-left">
      <div className={`p-4 rounded border ${
        isSafe
          ? 'bg-[#3ECF8E]/10 border-[#3ECF8E]/30 text-[#3ECF8E]'
          : 'bg-[#EC5F5B]/10 border-[#EC5F5B]/30 text-[#EC5F5B]'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{isSafe ? '✓' : '✗'}</span>
          <div>
            <p className="font-bold">
              {isSafe ? 'Query Passed All Guardrails' : 'Query Blocked by Guardrails'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
              Multi-tiered SQL security validation {isSafe ? 'passed' : 'failed'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {checks.map((check, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 bg-[#0E1116] border border-[#2A303C] rounded">
            <span className={check.passed ? 'text-[#3ECF8E] font-bold' : 'text-[#EC5F5B] font-bold'}>
              {check.passed ? '✓' : '✗'}
            </span>
            <div>
              <p className="font-bold text-[#F3F1EA]">{check.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{check.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
