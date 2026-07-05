import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface GuardProps {
  guardrailStatus: 'passed' | 'failed' | 'idle' | string;
  safetyStatus: 'safe' | 'blocked' | 'idle' | string;
}

export const GuardrailStatusCard: React.FC<GuardProps> = ({
  guardrailStatus,
  safetyStatus,
}) => {
  const isIdle = guardrailStatus === 'idle' || !guardrailStatus;
  const isPassed = guardrailStatus === 'passed';

  return (
    <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-5 text-left flex flex-col gap-4 font-sans-ui">
      <div>
        <h4 className="text-xs font-bold text-[#E6E8EF] uppercase tracking-wider flex items-center gap-2">
          <Shield size={14} className="text-[#53D6CC]" />
          <span>Security Guardrail Panel</span>
        </h4>
        <p className="text-[10px] text-[#7E8A99] mt-1 leading-normal font-semibold">
          Real-time SQL lexical inspection and sandbox validation.
        </p>
      </div>

      <div className="border-t border-[#252B36]/50 pt-4 flex flex-col gap-3 font-mono-code text-[11px]">
        {isIdle ? (
          <div className="text-center py-4 text-[#7E8A99] italic">
            Awaiting query validation...
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-[#7E8A99]">Guardrail Compliance:</span>
              <span className={`font-bold uppercase ${isPassed ? 'text-[#3ECF8E]' : 'text-[#EF5F5F]'}`}>
                {guardrailStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7E8A99]">Safety Policy:</span>
              <span className={`font-bold uppercase ${safetyStatus === 'safe' ? 'text-[#3ECF8E]' : 'text-[#EF5F5F]'}`}>
                {safetyStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7E8A99]">Execution Sandbox:</span>
              <span className="text-[#3ECF8E] font-bold">100% SELECT_ONLY</span>
            </div>

            {/* Glowing compliance visual state */}
            <div className={`mt-2 p-3 rounded border text-xs font-semibold flex items-center gap-2.5 ${
              isPassed 
                ? 'bg-[#3ECF8E]/5 border-[#3ECF8E]/30 text-[#3ECF8E] shadow-[0_0_12px_rgba(62,207,142,0.05)]' 
                : 'bg-[#EF5F5F]/5 border-[#EF5F5F]/30 text-[#EF5F5F] shadow-[0_0_12px_rgba(239,95,95,0.05)]'
            }`}>
              {isPassed ? (
                <>
                  <ShieldCheck size={16} />
                  <span>Validation passed. Query is safe to run.</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={16} />
                  <span>Blocked: Mutating keywords detected.</span>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default GuardrailStatusCard;
