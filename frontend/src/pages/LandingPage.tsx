import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[#E6E8EF] flex flex-col font-sans select-none selection:bg-[#53D6CC]/20 selection:text-[#53D6CC]">
      {/* 1. Header Navigation */}
      <nav className="bg-[var(--bg-base)]/80 backdrop-blur-md border-b border-[#252B36] px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <h1 className="text-xl font-bold font-display text-[#E6E8EF] tracking-tight flex items-center gap-1">
              <span className="text-[#53D6CC] font-mono-code font-bold drop-shadow-[0_0_8px_rgba(83,214,204,0.6)]">&gt;_</span> QueryGen AI
            </h1>
          </Link>
          <div className="flex items-center gap-8 text-sm font-semibold">
            <a href="#features" className="text-[#B8C0CC] hover:text-[#E6E8EF] transition-colors">Features</a>
            <a href="#pipeline" className="text-[#B8C0CC] hover:text-[#E6E8EF] transition-colors">Pipeline</a>
            <a href="#security" className="text-[#B8C0CC] hover:text-[#E6E8EF] transition-colors">Security</a>
            <Link to="/login" className="text-[#B8C0CC] hover:text-[#E6E8EF] transition-colors">
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="px-4 py-2 bg-[#53D6CC] hover:bg-[#53D6CC]/90 text-[#062A28] font-bold rounded text-xs transition-all shadow-[0_0_15px_rgba(83,214,204,0.25)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="px-6 pt-24 pb-20 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#252B36] bg-[#151922] text-[#53D6CC] font-mono-code text-xs font-bold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-ping" />
            <span>RAG-POWERED INTELLIGENCE</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Built for <br/>
            <span className="gradient-text">Database Intelligence</span>
          </h1>
          <p className="text-[#B8C0CC] text-sm sm:text-base leading-relaxed max-w-xl">
            QueryGen AI helps users query uploaded SQLite databases without manually writing SQL. It understands database schemas through RAG, generates SQLite queries safely, and executes only SELECT queries.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link 
              to="/signup" 
              className="px-6 py-3 bg-[#53D6CC] hover:bg-[#53D6CC]/90 text-[#062A28] font-bold text-sm rounded shadow-lg transition-all flex items-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight size={16} />
            </Link>
            <Link 
              to="/login" 
              className="px-6 py-3 bg-[#151922] hover:bg-[#202733] text-[#E6E8EF] border border-[#252B36] text-sm rounded transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Live Terminal Hero Mockup */}
        <div className="lg:col-span-6 w-full">
          <div className="hero-terminal text-left w-full h-[320px] flex flex-col font-mono-code text-xs leading-normal">
            <div className="terminal-window-header">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF5F5F]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5C26B]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
              <span className="text-slate-500 text-xs ml-2">querygen_agent_shell</span>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between overflow-y-auto bg-[#050505]">
              <div>
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-[#53D6CC] font-bold">&gt;</span>
                  <span className="text-[#E6E8EF]">Show top 5 companies by package as bar graph</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4 pl-5">
                  <span className="text-slate-600 text-xs uppercase font-bold">RAG Retrieval:</span>
                  <span className="px-2 py-0.5 bg-[#53D6CC]/10 border border-[#53D6CC]/30 text-[#53D6CC] text-xs rounded">
                    [table] companies
                  </span>
                  <span className="px-2 py-0.5 bg-[#53D6CC]/10 border border-[#53D6CC]/30 text-[#53D6CC] text-xs rounded">
                    [column] package_lpa
                  </span>
                </div>

                <div className="pl-5 border-l-2 border-[#8B7CF6]/20 py-1 space-y-1">
                  <span className="text-slate-500 block mb-1">-- LLM generated query:</span>
                  <div className="text-[#8B7CF6] font-bold">
                    <span className="text-[#8B7CF6]">SELECT</span> name, package_lpa
                  </div>
                  <div className="text-[#8B7CF6] font-bold">
                    <span className="text-[#8B7CF6]">FROM</span> companies
                  </div>
                  <div className="text-[#8B7CF6] font-bold">
                    <span className="text-[#8B7CF6]">ORDER BY</span> package_lpa DESC
                  </div>
                  <div className="text-[#8B7CF6] font-bold">
                    <span className="text-[#8B7CF6]">LIMIT</span> 5;
                  </div>
                </div>
              </div>
              <div className="text-slate-500 text-xs border-t border-[#252B36] pt-2.5 flex items-center justify-between font-mono">
                <span>Safe SELECT mode enforced</span>
                <span className="text-[#3ECF8E] font-bold">Validated 12ms</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Pipeline Trace Section */}
      <section id="pipeline" className="px-6 py-24 border-t border-[#252B36] bg-[var(--bg-base)]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Pipeline Trace Execution</h2>
          <p className="text-xs text-[#7E8A99] mb-16 font-semibold">
            Real-time telemetry and validation at every step of the generation process.
          </p>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 max-w-5xl mx-auto">
            {/* Connected horizontal background line */}
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#252B36] -translate-y-1/2 hidden md:block z-0" />
            
            {[
              { label: "Question", step: "1", desc: "User asks in plain English", highlight: false },
              { label: "RAG Retrieval", step: "2", desc: "Matches vector embeddings", highlight: false },
              { label: "LLM Gen", step: "3", desc: "Complex prompt template", highlight: false },
              { label: "Guardrail", step: "4", desc: "Enforces SELECT rules", highlight: true },
              { label: "Execution", step: "5", desc: "Runs local SQLite DB", highlight: false },
              { label: "Result", step: "6", desc: "Renders tables/charts", highlight: false }
            ].map((p, idx) => {
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center bg-[var(--bg-base)] px-4 py-2">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono-code text-xs font-bold transition-all duration-300 ${
                    p.highlight 
                      ? 'border-[#53D6CC] bg-[#53D6CC]/10 text-[#53D6CC] shadow-[0_0_15px_rgba(83,214,204,0.35)]'
                      : 'border-[#252B36] bg-[#151922] text-[#7E8A99]'
                  }`}>
                    {p.step}
                  </div>
                  <h4 className={`font-mono-code text-xs font-bold mt-4 mb-1 ${p.highlight ? 'text-[#53D6CC]' : 'text-[#E6E8EF]'}`}>{p.label}</h4>
                  <p className="text-xs text-[#7E8A99] font-medium max-w-[120px] leading-tight mt-0.5">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Feature Showcase Grid */}
      <section id="features" className="px-6 py-20 border-t border-[#252B36] bg-[var(--bg-base)] max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          {/* Card 1 */}
          <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs text-[#8B7CF6] font-mono-code uppercase font-bold tracking-widest">CORE CAPABILITY</span>
              <h3 className="text-xl font-bold text-[#E6E8EF] mt-3">Natural Language to SQL</h3>
              <p className="text-[#B8C0CC] text-xs leading-relaxed mt-4">
                Transform conversational queries into production-ready SQL scripts without revealing sensitive schema secrets or connection strings.
              </p>
            </div>
            <div className="mt-8 bg-[#050505] p-3 rounded font-mono-code text-[11px] text-[#53D6CC]">
              $ ask: "calculate churn rate for Q1 by region"
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs text-[#EF5F5F] font-mono-code uppercase font-bold tracking-widest">COMPLIANCE SECURITY</span>
              <h3 className="text-xl font-bold text-[#E6E8EF] mt-3">SELECT-Only Guardrails</h3>
              <p className="text-[#B8C0CC] text-xs leading-relaxed mt-4">
                Automatically blocks UPDATE, DELETE, and DROP commands before they ever touch your database server. Rigorous multi-tier lexical analyzer.
              </p>
            </div>
            <div className="mt-8 bg-[#050505] p-3 rounded font-mono-code text-[11px] text-[#EF5F5F] border border-[#EF5F5F]/20">
              [BLOCKED] Rejected query contains restricted mutator DROP/DELETE.
            </div>
          </div>
        </div>
      </section>

      {/* 5. Enterprise Security Panel */}
      <section id="security" className="px-6 py-24 border-t border-[#252B36] bg-[var(--bg-base)]">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-8 md:p-12 text-left flex flex-col lg:flex-row gap-12 items-center justify-between">
            <div className="max-w-2xl">
              <span className="text-[#8B7CF6] font-mono-code text-xs uppercase font-bold tracking-wider">Zero-Trust Architecture</span>
              <h2 className="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">Enterprise-Grade Security</h2>
              
              <div className="flex flex-col gap-6 mt-8 font-sans-ui">
                <div className="flex gap-4">
                  <div className="w-5 h-5 rounded-full bg-[#3ECF8E]/10 flex items-center justify-center text-[#3ECF8E] shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#E6E8EF]">Read-Only SQL Execution</h4>
                    <p className="text-xs text-[#7E8A99] mt-1 leading-normal font-semibold">
                      Database roles are strictly restricted to SELECT privileges at the engine level. No write queries permitted.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-5 h-5 rounded-full bg-[#3ECF8E]/10 flex items-center justify-center text-[#3ECF8E] shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#E6E8EF]">Audit Telemetry</h4>
                    <p className="text-xs text-[#7E8A99] mt-1 leading-normal font-semibold">
                      Every prompt, generated query, and validation status is logged for security audits and performance tuning.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-5 h-5 rounded-full bg-[#3ECF8E]/10 flex items-center justify-center text-[#3ECF8E] shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#E6E8EF]">Encrypted Context Storage</h4>
                    <p className="text-xs text-[#7E8A99] mt-1 leading-normal font-semibold">
                      Schema definitions are matched semantically from vectors inside tenant-isolated Qdrant collections.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#10141B] border border-[#252B36] p-8 rounded flex flex-col justify-center text-center font-mono-code w-full lg:w-72 shrink-0 shadow-lg">
              <span className="text-[#3ECF8E] text-4xl mb-3">🛡️</span>
              <span className="text-xl font-bold text-[#E6E8EF]">100% SELECT</span>
              <span className="text-xs text-slate-500 uppercase tracking-widest mt-1.5 font-bold">Read-Only Safe</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Call To Action Footer */}
      <footer className="border-t border-[#252B36] py-16 text-center mt-auto px-6 bg-[var(--bg-sidebar)]">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          <h3 className="text-xl font-bold text-[#E6E8EF] tracking-tight">Ready to Query?</h3>
          <p className="text-xs text-[#7E8A99] mt-2.5 leading-relaxed font-semibold">
            Gain immediate, RAG-grounded natural language query access to your SQLite databases. 100% secure, SELECT-only.
          </p>
          <Link 
            to="/signup" 
            className="mt-6 px-6 py-3 bg-[#53D6CC] hover:bg-[#53D6CC]/90 text-[#062A28] font-bold text-xs rounded shadow-md transition-all w-full sm:w-auto"
          >
            Launch QueryGen Console
          </Link>
          <div className="mt-8 text-xs text-slate-600 font-mono-code">
            © {new Date().getFullYear()} QueryGen AI. Built for Database Intelligence. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
