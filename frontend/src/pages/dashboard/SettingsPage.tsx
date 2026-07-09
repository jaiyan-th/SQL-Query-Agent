import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { 
  KeyRound, 
  ShieldAlert, 
  Sliders, 
  CheckCircle
} from 'lucide-react';
import { getLlmStatus } from '../../services/api';

export const SettingsPage: React.FC = () => {
  // Model status states
  const [groqConfigured, setGroqConfigured] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState('');
  
  // Model & options settings
  const [activeModel, setActiveModel] = useState('groq-llama3-70b');
  const [strictGuardrails, setStrictGuardrails] = useState(true);
  const [autoRunSelect, setAutoRunSelect] = useState(false);
  
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Proactively clear existing keys from localStorage for security
    localStorage.removeItem('querygen_groq_key');
    localStorage.removeItem('querygen_gemini_key');

    // Load config from localStorage
    const savedModel = localStorage.getItem('querygen_active_model') || 'groq-llama3-70b';
    const savedStrict = localStorage.getItem('querygen_strict_guardrails') !== 'false';
    const savedAutoRun = localStorage.getItem('querygen_auto_run_select') === 'true';

    setActiveModel(savedModel);
    setStrictGuardrails(savedStrict);
    setAutoRunSelect(savedAutoRun);

    const fetchStatus = async () => {
      try {
        setLoadingStatus(true);
        const status = await getLlmStatus();
        setGroqConfigured(status.groq_configured);
        setGeminiConfigured(status.gemini_configured);
      } catch (err: any) {
        console.error('Failed to fetch LLM status', err);
        setStatusError('Failed to retrieve model provider status.');
      } finally {
        setLoadingStatus(false);
      }
    };
    
    fetchStatus();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('querygen_active_model', activeModel);
    localStorage.setItem('querygen_strict_guardrails', String(strictGuardrails));
    localStorage.setItem('querygen_auto_run_select', String(autoRunSelect));

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };


  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 text-left max-w-3xl">
        {/* Title Controls */}
        <div>
          <h2 className="text-3xl font-bold font-display text-[#E6E8EF] tracking-tight">
            User Settings
          </h2>
          <p className="text-xs text-[#7E8A99] mt-1 font-semibold leading-relaxed">
            Configure LLM routing preference, execution safety thresholds, and active workspace configurations.
          </p>
        </div>

        {/* Saved Success Notification */}
        {saved && (
          <div className="bg-[#3ECF8E]/5 border border-[#3ECF8E]/35 text-[#3ECF8E] px-4 py-3 rounded text-xs font-mono-code font-bold flex items-center gap-2">
            <CheckCircle size={14} />
            <span>Configuration changes successfully committed.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-6 font-sans-ui">
          {/* Card 1: Model Provider Status */}
          <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold text-[#E6E8EF] uppercase tracking-wider flex items-center gap-2.5">
              <KeyRound size={16} className="text-[#53D6CC]" />
              <span>Model Provider Status</span>
            </h3>

            <p className="text-xs text-[#7E8A99] leading-relaxed">
              LLM provider credentials are managed securely through backend environment variables.
            </p>

            {statusError && (
              <div className="text-xs text-[#EF5F5F] font-semibold">
                ⚠️ {statusError}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Groq Status */}
              <div className="flex items-center justify-between bg-[#10141B] border border-[#252B36] rounded px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-[#E6E8EF]">Groq Primary Engine</span>
                  <span className="text-[10px] text-slate-500 font-mono">(llama-3.3-70b-versatile)</span>
                </div>
                <div className="flex items-center gap-2">
                  {loadingStatus ? (
                    <span className="text-xs font-mono text-[#7E8A99] animate-pulse">Checking...</span>
                  ) : (
                    <>
                      <span className={`w-2 h-2 rounded-full ${groqConfigured ? 'bg-[#3ECF8E]' : 'bg-[#EF5F5F]'}`} />
                      <span className={`text-xs font-mono font-bold ${groqConfigured ? 'text-[#3ECF8E]' : 'text-[#EF5F5F]'}`}>
                        {groqConfigured ? 'Connected' : 'Not Configured'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Gemini Status */}
              <div className="flex items-center justify-between bg-[#10141B] border border-[#252B36] rounded px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-[#E6E8EF]">Gemini Fallback Engine</span>
                  <span className="text-[10px] text-slate-500 font-mono">(gemini-1.5-flash)</span>
                </div>
                <div className="flex items-center gap-2">
                  {loadingStatus ? (
                    <span className="text-xs font-mono text-[#7E8A99] animate-pulse">Checking...</span>
                  ) : (
                    <>
                      <span className={`w-2 h-2 rounded-full ${geminiConfigured ? 'bg-[#3ECF8E]' : 'bg-[#EF5F5F]'}`} />
                      <span className={`text-xs font-mono font-bold ${geminiConfigured ? 'text-[#3ECF8E]' : 'text-[#EF5F5F]'}`}>
                        {geminiConfigured ? 'Connected' : 'Not Configured'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Configuration settings */}
          <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold text-[#E6E8EF] uppercase tracking-wider flex items-center gap-2.5">
              <Sliders size={16} className="text-[#53D6CC]" />
              <span>Agent Configurations</span>
            </h3>

            <div className="flex flex-col gap-5 font-sans-ui text-xs">
              {/* Active Model Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#B8C0CC]">Active LLM Routing Model</label>
                <select
                  value={activeModel}
                  onChange={(e) => setActiveModel(e.target.value)}
                  className="bg-[#10141B] border border-[#252B36] hover:border-[#313846] focus:border-[#53D6CC] text-[#E6E8EF] text-xs rounded px-3 py-2.5 outline-none font-mono"
                >
                  <option value="groq-llama3-70b">Groq Llama 3 (70B) — High Speed</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro — Deep Reasoning</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash — Fast Reasoning</option>
                </select>
              </div>

              {/* Strict Guardrails Toggle */}
              <div className="flex items-start justify-between border-t border-[#252B36]/60 pt-4 mt-2">
                <div className="flex flex-col gap-1 pr-4">
                  <h4 className="font-bold text-[#E6E8EF] flex items-center gap-1.5 select-none">
                    <ShieldAlert size={14} className="text-[#EF5F5F]" />
                    <span>Strict Guardrails Enforcement</span>
                  </h4>
                  <p className="text-[11px] text-[#7E8A99] leading-normal font-semibold">
                    Lexically parse generated SQL statements. Rejects all mutations, administrative commands, and transaction definitions.
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  checked={strictGuardrails}
                  onChange={(e) => setStrictGuardrails(e.target.checked)}
                  className="w-5 h-5 rounded border-[#252B36] accent-[#53D6CC] cursor-pointer"
                />
              </div>

              {/* Auto Run SELECT Toggle */}
              <div className="flex items-start justify-between border-t border-[#252B36]/60 pt-4">
                <div className="flex flex-col gap-1 pr-4">
                  <h4 className="font-bold text-[#E6E8EF] flex items-center gap-1.5 select-none">
                    <Sliders size={14} className="text-[#8B7CF6]" />
                    <span>Auto-run Safe SELECT Queries</span>
                  </h4>
                  <p className="text-[11px] text-[#7E8A99] leading-normal font-semibold">
                    Automatically run safe SELECT queries in sandbox mode immediately after SQL generation.
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoRunSelect}
                  onChange={(e) => setAutoRunSelect(e.target.checked)}
                  className="w-5 h-5 rounded border-[#252B36] accent-[#53D6CC] cursor-pointer"
                />
              </div>

            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary w-full sm:w-auto px-8">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};
