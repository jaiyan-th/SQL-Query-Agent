import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { 
  KeyRound, 
  ShieldAlert, 
  Sliders, 
  Eye, 
  EyeOff, 
  CheckCircle
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  // Key state
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showGroq, setShowGroq] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  
  // Model & options settings
  const [activeModel, setActiveModel] = useState('groq-llama3-70b');
  const [strictGuardrails, setStrictGuardrails] = useState(true);
  const [autoRunSelect, setAutoRunSelect] = useState(true);
  
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load config from localStorage
    const savedGroq = localStorage.getItem('querygen_groq_key') || '';
    const savedGemini = localStorage.getItem('querygen_gemini_key') || '';
    const savedModel = localStorage.getItem('querygen_active_model') || 'groq-llama3-70b';
    const savedStrict = localStorage.getItem('querygen_strict_guardrails') !== 'false';
    const savedAutoRun = localStorage.getItem('querygen_auto_run_select') !== 'false';

    setGroqKey(savedGroq);
    setGeminiKey(savedGemini);
    setActiveModel(savedModel);
    setStrictGuardrails(savedStrict);
    setAutoRunSelect(savedAutoRun);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('querygen_groq_key', groqKey);
    localStorage.setItem('querygen_gemini_key', geminiKey);
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
            Configure LLM credentials, execution safety thresholds, and active workspace configurations.
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
          {/* Card 1: API keys */}
          <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold text-[#E6E8EF] uppercase tracking-wider flex items-center gap-2.5">
              <KeyRound size={16} className="text-[#53D6CC]" />
              <span>Model Provider Credentials</span>
            </h3>

            <div className="flex flex-col gap-4">
              {/* Groq Key */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#B8C0CC] flex items-center gap-1.5 select-none">
                  <span>Groq API Key</span>
                  <span className="text-[10px] text-slate-500 font-mono">(Primary Gen Engine)</span>
                </label>
                <div className="relative flex items-center">
                  <input 
                    type={showGroq ? 'text' : 'password'} 
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-[#10141B] border border-[#252B36] hover:border-[#313846] focus:border-[#53D6CC] rounded px-3 py-2 text-xs font-mono text-[#E6E8EF] outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowGroq(!showGroq)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300 border-none bg-transparent cursor-pointer p-1"
                  >
                    {showGroq ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Gemini Key */}
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-bold text-[#B8C0CC] flex items-center gap-1.5 select-none">
                  <span>Gemini API Key</span>
                  <span className="text-[10px] text-slate-500 font-mono">(Fallback Agent Engine)</span>
                </label>
                <div className="relative flex items-center">
                  <input 
                    type={showGemini ? 'text' : 'password'} 
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#10141B] border border-[#252B36] hover:border-[#313846] focus:border-[#53D6CC] rounded px-3 py-2 text-xs font-mono text-[#E6E8EF] outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowGemini(!showGemini)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300 border-none bg-transparent cursor-pointer p-1"
                  >
                    {showGemini ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
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
