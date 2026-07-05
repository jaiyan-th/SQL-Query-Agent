import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const [promptText, setPromptText] = useState('');
  const [showRAGTags, setShowRAGTags] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const fullPrompt = "Show monthly revenue by category as bar chart";
  const sqlLines = [
    "SELECT category, SUM(revenue) AS total",
    "FROM sales",
    "GROUP BY category",
    "ORDER BY total DESC",
    "LIMIT 10;"
  ];

  // 1. Simulating the Hero Typing Sequence
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullPrompt.length) {
        setPromptText((prev) => prev + fullPrompt[index]);
        index++;
      } else {
        clearInterval(interval);
        // Step 2: Show RAG tags after typing prompt
        setTimeout(() => {
          setShowRAGTags(true);
          // Step 3: Show SQL query line-by-line
          setTimeout(() => {
            setShowSQL(true);
          }, 800);
        }, 600);
      }
    }, 45);

    return () => clearInterval(interval);
  }, []);

  // 2. Simulating the Pipeline status indicator cycling
  useEffect(() => {
    const cycle = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 6);
    }, 2000);
    return () => clearInterval(cycle);
  }, []);

  return (
    <div className="min-h-screen bg-[#0E1116] text-[#F3F1EA] flex flex-col font-sans select-none selection:bg-[#4FD1C5]/20 selection:text-[#4FD1C5]">
      {/* 1. Header Navigation */}
      <nav className="bg-[#0E1116]/80 backdrop-blur-md border-b border-[#2A303C] px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <h1 className="text-xl font-bold font-display text-[#F3F1EA] tracking-tight flex items-center gap-1">
              <span className="text-[#4FD1C5] font-mono-code font-bold drop-shadow-[0_0_8px_rgba(79,209,197,0.6)]">&gt;_</span> QueryGen AI
            </h1>
          </Link>
          <div className="flex items-center gap-6">
            <Link 
              to="/login" 
              className="text-sm font-semibold text-[#F3F1EA]/70 hover:text-[#F3F1EA] transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="px-4 py-2 bg-[#8B7CF6] hover:bg-[#8B7CF6]/90 text-[#0E1116] font-mono-code text-xs font-bold rounded shadow-md transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="px-6 pt-16 pb-20 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#2A303C] bg-[#161A22] text-[#4FD1C5] font-mono-code text-xs mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-ping" />
            -- RAG-Powered Natural Language to SQL Query Agent
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight font-mono-code">
            <span className="text-[#8B7CF6]">--</span> QueryGen AI <br/>
            SQL Query Agent
          </h1>
          <p className="text-slate-400 mt-6 text-sm sm:text-base leading-relaxed max-w-xl">
            QueryGen AI converts natural language questions into safe SQL queries using RAG, LLMs, Neon PostgreSQL schema grounding, Qdrant vector search, and backend SQL guardrails.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link 
              to="/signup" 
              className="px-6 py-3 bg-[#4FD1C5] hover:bg-[#4FD1C5]/90 text-[#0E1116] font-mono-code font-bold text-sm rounded shadow-lg transition-all"
            >
              Get Started
            </Link>
            <Link 
              to="/login" 
              className="px-6 py-3 bg-[#161A22] hover:bg-[#202733] text-[#F3F1EA] border border-[#2A303C] font-mono-code text-sm rounded transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Live Terminal Hero Mockup */}
        <div className="lg:col-span-6 w-full">
          <div className="terminal-panel text-left w-full h-[320px] flex flex-col font-mono-code text-xs leading-normal">
            <div className="terminal-header">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <span className="text-slate-500 text-[10px] ml-2">querygen_agent_shell</span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto">
              <div>
                {/* Typed Question Prompt */}
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-[#4FD1C5]">&gt;</span>
                  <span className="cursor-blink font-semibold text-[#F3F1EA]">
                    {promptText}
                  </span>
                </div>

                {/* Grounded RAG Schema Tags */}
                {showRAGTags && (
                  <div className="flex flex-wrap items-center gap-2 mb-4 animate-fade-in pl-5">
                    <span className="text-[#4FD1C5]/50 text-[10px] uppercase font-bold">RAG Retrieval:</span>
                    <span className="px-2 py-0.5 bg-[#4FD1C5]/10 border border-[#4FD1C5]/30 text-[#4FD1C5] text-[10px] rounded">
                      [table] sales
                    </span>
                    <span className="px-2 py-0.5 bg-[#4FD1C5]/10 border border-[#4FD1C5]/30 text-[#4FD1C5] text-[10px] rounded">
                      [column] revenue
                    </span>
                  </div>
                )}

                {/* Generated SQL output */}
                {showSQL && (
                  <div className="pl-5 border-l-2 border-[#8B7CF6]/20 py-1 space-y-1">
                    <span className="text-slate-500 block mb-1">-- LLM generated query:</span>
                    {sqlLines.map((line, idx) => (
                      <div key={idx} className="text-[#8B7CF6] font-bold">
                        {line.split(' ').map((word, wIdx) => {
                          const isKeyword = ["SELECT", "FROM", "GROUP", "ORDER", "BY", "DESC", "LIMIT", "SUM", "AS"].includes(word.replace(';', '').replace(',', ''));
                          const isTable = ["sales"].includes(word.replace(';', '').replace(',', ''));
                          return (
                            <span 
                              key={wIdx} 
                              className={isKeyword ? "text-[#8B7CF6]" : isTable ? "text-[#4FD1C5]" : "text-[#F3F1EA]"}
                            >
                              {word}{' '}
                            </span>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-slate-500 text-[10px] border-t border-[#2A303C] pt-2 flex items-center justify-between">
                <span>Safe SELECT mode enforced</span>
                <span className="text-[#3ECF8E] font-bold">✓ Validated</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Tech Stack Strip */}
      <section className="bg-[#161A22] border-y border-[#2A303C] py-6 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] font-mono-code uppercase tracking-wider text-slate-500 mb-3">-- core technologies</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-xs font-mono-code font-bold text-slate-400">
            <span>FastAPI</span>
            <span>Neon PostgreSQL</span>
            <span>Qdrant Cloud</span>
            <span>Groq / Gemini</span>
            <span>React + TypeScript</span>
            <span>Render</span>
          </div>
        </div>
      </section>

      {/* 4. Connected Pipeline Trace Section */}
      <section className="px-6 py-24 bg-[#0E1116]">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-xl md:text-2xl font-bold font-mono-code mb-16">
            <span className="text-[#8B7CF6]">&gt;</span> Pipeline Trace Execution
          </h3>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 max-w-5xl mx-auto">
            {/* Connected horizontal background line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#2A303C] -translate-y-1/2 hidden md:block z-0" />
            
            {[
              { label: "Question", step: "Input", desc: "User asks in plain English" },
              { label: "RAG Retrieval", step: "Schema context", desc: "Matches vector embeddings" },
              { label: "LLM Gen", step: "Draft SQL", desc: "Compiles prompt templates" },
              { label: "Guardrail", step: "Validation", desc: "Enforces SELECT rules" },
              { label: "Execution", step: "Connection", desc: "Runs Neon PostgreSQL" },
              { label: "Result", step: "Output", desc: "Renders table/charts" }
            ].map((p, idx) => {
              const isCurrent = idx === activeStep;
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center bg-[#0E1116] px-4 py-2">
                  {/* Status dot */}
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono-code text-xs font-bold transition-all duration-300 ${
                    isCurrent 
                      ? 'border-[#4FD1C5] bg-[#4FD1C5] text-[#0E1116] scale-110 shadow-[0_0_15px_rgba(79,209,197,0.4)]'
                      : 'border-[#2A303C] bg-[#161A22] text-slate-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <h4 className="font-mono-code text-xs font-bold text-[#F3F1EA] mt-4 mb-1">{p.label}</h4>
                  <p className="text-[10px] text-slate-400 font-medium max-w-[120px] leading-tight">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Showcase Section */}
      <section className="px-6 py-12 max-w-7xl mx-auto w-full">
        <div className="terminal-panel p-8 md:p-12 text-left flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="max-w-2xl">
            <span className="text-[#8B7CF6] font-mono-code text-xs">-- overview</span>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-2 font-mono-code tracking-tight">Built for Database Intelligence</h2>
            <p className="text-slate-400 mt-4 leading-relaxed text-sm">
              QueryGen AI helps users query relational databases without manually writing SQL. It understands database schemas through RAG, generates SQL safely, executes only SELECT queries, and formats results into useful outputs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 font-mono-code text-xs">
              <div className="flex items-start gap-2">
                <span className="text-[#3ECF8E]">✓</span>
                <span className="text-slate-300">Converts natural language into SQL</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#3ECF8E]">✓</span>
                <span className="text-slate-300">Uses Qdrant RAG to prevent table hallucinations</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#3ECF8E]">✓</span>
                <span className="text-slate-300">Supports generate-only &amp; run configurations</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#3ECF8E]">✓</span>
                <span className="text-slate-300">Displays charts, tables, and summaries</span>
              </div>
            </div>
          </div>
          <div className="bg-[#1A1F29] border border-[#2A303C] p-6 rounded-xl flex flex-col justify-center text-center font-mono-code w-full md:w-auto">
            <span className="text-[#3ECF8E] text-4xl mb-2">🛡️</span>
            <span className="text-xl font-bold text-[#F3F1EA]">100% SELECT</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Read-Only Safe</span>
          </div>
        </div>
      </section>

      {/* 6. Capabilities as CLI Terminal Checklist */}
      <section className="px-6 py-20 max-w-7xl mx-auto w-full">
        <h3 className="text-xl md:text-2xl font-bold text-center font-mono-code mb-12">
          <span className="text-[#8B7CF6]">&gt;</span> CLI capabilities_trace
        </h3>
        
        <div className="terminal-panel max-w-3xl mx-auto font-mono-code text-xs p-6 space-y-4">
          <div className="text-slate-500 mb-2">-- Fetching core agent specifications...</div>
          
          {[
            {
              title: "Natural Language to SQL",
              desc: "Ask questions in plain English and generate accurate SQL using schema-aware RAG."
            },
            {
              title: "Query Generation Mode",
              desc: "Generate SQL without executing it. Review, copy, and validate the query safely."
            },
            {
              title: "Generate and Execute Mode",
              desc: "Generate SQL, validate it with guardrails, execute safe SELECT queries, and view results inside the app."
            },
            {
              title: "Qdrant RAG Grounding",
              desc: "Retrieve relevant table, column, and relationship context from Qdrant before SQL generation."
            },
            {
              title: "Chatbot Output Formats",
              desc: "Ask for output as table, bar chart, pie chart, text answer, report, or analysis."
            },
            {
              title: "Production SQL Guardrails",
              desc: "Block unsafe SQL commands, enforce read-only execution, inject limits, and prevent destructive queries."
            }
          ].map((feat, idx) => (
            <div key={idx} className="flex items-start gap-3 pl-2 border-l border-[#2A303C] py-1">
              <span className="text-[#3ECF8E] font-bold">[✓]</span>
              <div>
                <span className="font-bold text-[#F3F1EA]">{feat.title}</span>
                <p className="text-[#F3F1EA]/65 mt-1 leading-normal">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Use Cases Section */}
      <section className="px-6 py-12 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="terminal-panel p-6">
          <h3 className="text-sm font-bold font-mono-code mb-6 flex items-center gap-1.5">
            <span className="text-[#8B7CF6]">&gt;</span> SQL Query Agent Use Cases
          </h3>
          <ul className="space-y-4 font-mono-code text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5]">&gt;_</span>
              <span><strong>Explore tables:</strong> "Show all customers from Chennai as table"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5]">&gt;_</span>
              <span><strong>Analyze records:</strong> "Show top 5 products by revenue as bar chart"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5]">&gt;_</span>
              <span><strong>Compare distributions:</strong> "Show employee count by department as pie chart"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5]">&gt;_</span>
              <span><strong>Generate reports:</strong> "Generate a report on monthly sales"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5]">&gt;_</span>
              <span><strong>Explain data:</strong> "Explain total revenue by category in text"</span>
            </li>
          </ul>
        </div>

        <div className="terminal-panel p-6">
          <h3 className="text-sm font-bold font-mono-code mb-6 flex items-center gap-1.5">
            <span className="text-[#8B7CF6]">&gt;</span> Security highlights
          </h3>
          <ul className="space-y-4 font-mono-code text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-[#3ECF8E]">[✓]</span>
              <span><strong>Read-Only SQL Execution:</strong> Enforces SELECT query configurations on active PostgreSQL databases.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#3ECF8E]">[✓]</span>
              <span><strong>SELECT-Only Guardrails:</strong> Rejects structural updates, mutations, updates, or destructive queries.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#3ECF8E]">[✓]</span>
              <span><strong>Qdrant Grounding:</strong> No database secrets are exposed; schema context is matched using dynamic Qdrant vector documents.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#3ECF8E]">[✓]</span>
              <span><strong>JWT Protection:</strong> All API requests are protected via OAuth2 Bearer token validation layers.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#3ECF8E]">[✓]</span>
              <span><strong>Audit Telemetry:</strong> Log queries, performance speed, execution status, and security errors.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* 8. Call To Action Footer */}
      <footer className="border-t border-[#2A303C] py-16 text-center mt-auto px-6 bg-[#161A22]/30">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          <h3 className="text-xl font-bold font-mono-code text-[#F3F1EA] tracking-tight">Ready to Query?</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Gain immediate, RAG-grounded natural language query access to your PostgreSQL databases. 100% secure, SELECT-only.
          </p>
          <Link 
            to="/signup" 
            className="mt-6 px-6 py-3 bg-[#4FD1C5] hover:bg-[#4FD1C5]/90 text-[#0E1116] font-mono-code font-bold text-xs rounded shadow-md transition-all w-full sm:w-auto"
          >
            Launch QueryGen Console
          </Link>
          <div className="mt-8 text-[10px] text-slate-600 font-mono-code">
            © {new Date().getFullYear()} QueryGen AI. Built for Database Intelligence. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
