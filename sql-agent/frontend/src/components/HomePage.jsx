import React from 'react'
import {
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
  Zap,
  Database,
  BarChart3,
  Sparkles,
  Terminal,
  Layers,
} from 'lucide-react'
import { Mark } from './Sidebar'

export default function HomePage({ onOpenAuth }) {
  return (
    <div className="home-layout">
      {/* Top Navbar */}
      <header className="home-nav">
        <div className="home-brand">
          <Mark />
          <span className="home-brand-text">SQL Query Agent</span>
        </div>

        <div className="home-nav-actions" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="home-nav-link"
            onClick={() => onOpenAuth('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="home-nav-btn"
            onClick={() => onOpenAuth('signup')}
          >
            <span>Sign up</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="home-hero-clean">
        <div className="hero-content">
          <div className="hero-pill">
            <Sparkles size={13} />
            <span>AI Database Agent</span>
            <span className="pill-dot">·</span>
            <span>Neon PostgreSQL & Groq</span>
          </div>

          <h1 className="hero-heading">
            Talk to your database.<br />
            Inspect the <em>SQL & charts</em>.
          </h1>

          <p className="hero-lead">
            Ask plain English questions, explore auto-generated charts, and verify every read-only query.
            No manual SQL syntax, zero write risks.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="cta-primary"
              onClick={() => onOpenAuth('signup')}
            >
              <span>Get started free</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="cta-secondary"
              onClick={() => onOpenAuth('login')}
            >
              <span>Sign in to Workspace</span>
            </button>
          </div>
        </div>

        {/* Product Visual Mockup */}
        <div className="hero-preview-wrap">
          <div className="mockup-window">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="mockup-address">
                <LockKeyhole size={11} />
                <span>sql-query-agent / workspace</span>
              </div>
              <div className="mockup-tag">
                <ShieldCheck size={12} />
                <span>Read-only active</span>
              </div>
            </div>

            <div className="mockup-body">
              {/* User Prompt */}
              <div className="mockup-user-bubble">
                <span>Revenue by month this year</span>
              </div>

              {/* Agent Answer */}
              <div className="mockup-agent-card">
                <div className="mockup-agent-head">
                  <Mark />
                  <strong>Query Agent</strong>
                  <span className="mockup-latency">
                    <Zap size={11} /> Groq 380ms
                  </span>
                </div>

                <p className="mockup-answer-text">
                  Total revenue for 2026 reached <strong>₹28,45,200</strong> across 360 completed orders, peaking in October.
                </p>

                {/* Visual Chart Mockup */}
                <div className="mockup-chart-card">
                  <div className="chart-card-head">
                    <div className="chart-title">
                      <BarChart3 size={13} />
                      <span>Monthly Revenue Trend (INR)</span>
                    </div>
                    <div className="chart-actions">
                      <span className="chart-chip active">Chart</span>
                      <span className="chart-chip">Table</span>
                    </div>
                  </div>

                  <div className="chart-bars-wrap">
                    <div className="chart-bar-col"><div className="chart-bar-fill" style={{ height: '42%' }}></div><span>Jan</span></div>
                    <div className="chart-bar-col"><div className="chart-bar-fill" style={{ height: '55%' }}></div><span>Feb</span></div>
                    <div className="chart-bar-col"><div className="chart-bar-fill" style={{ height: '48%' }}></div><span>Mar</span></div>
                    <div className="chart-bar-col"><div className="chart-bar-fill" style={{ height: '68%' }}></div><span>Apr</span></div>
                    <div className="chart-bar-col"><div className="chart-bar-fill" style={{ height: '74%' }}></div><span>May</span></div>
                    <div className="chart-bar-col"><div className="chart-bar-fill" style={{ height: '62%' }}></div><span>Jun</span></div>
                    <div className="chart-bar-col"><div className="chart-bar-fill" style={{ height: '81%' }}></div><span>Jul</span></div>
                    <div className="chart-bar-col"><div className="chart-bar-fill" style={{ height: '94%' }}></div><span>Aug</span></div>
                    <div className="chart-bar-col"><div className="chart-bar-fill" style={{ height: '88%' }}></div><span>Sep</span></div>
                    <div className="chart-bar-col highlight"><div className="chart-bar-fill" style={{ height: '100%' }}></div><span>Oct</span></div>
                    <div className="chart-bar-col"><div className="chart-bar-fill" style={{ height: '76%' }}></div><span>Nov</span></div>
                  </div>
                </div>

                {/* SQL Chip */}
                <div className="mockup-sql-chip">
                  <Terminal size={12} />
                  <code>SELECT strftime('%Y-%m', order_date) AS month, SUM(total_inr) AS revenue FROM orders GROUP BY month;</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Value Pillars */}
        <section className="home-pillars">
          <div className="pillar-card">
            <div className="pillar-icon"><Zap size={18} /></div>
            <h3>Sub-Second SQL Inference</h3>
            <p>Converts complex multi-table analytics questions into correct SQL in milliseconds using Groq's Llama 3.3 engine.</p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon"><ShieldCheck size={18} /></div>
            <h3>100% Read-Only Safety</h3>
            <p>AST analysis via sqlglot prevents updates, deletes, and DDL commands. Enforced with read-only database transactions.</p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon"><Database size={18} /></div>
            <h3>Backed by Neon Postgres</h3>
            <p>Connected to serverless Neon PostgreSQL for pooled application queries, persistent chat history, and secure sessions.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="home-footer-clean">
        <p>SQL Query Agent · Natural Language Analytics on Neon PostgreSQL · Guaranteed Read-Only</p>
      </footer>
    </div>
  )
}
