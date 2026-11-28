import React, { useState } from 'react'
import {
  LockKeyhole,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Zap,
  Database,
  BarChart3,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { login, signup } from '../api'
import { Mark } from './Sidebar'

const SAMPLE_QUESTIONS = [
  'How many customers do we have?',
  'Top 5 customers by total spend.',
  'Revenue by month this year.',
  'Which product category sold the most units?',
]

export default function HomePage({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const result = mode === 'signup'
        ? await signup(name, email, password)
        : await login(email, password)
      onAuth(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  return (
    <div className="home-layout">
      {/* Top Navigation */}
      <header className="home-nav">
        <div className="home-brand">
          <Mark />
          <span className="home-brand-text">SQL Query Agent</span>
        </div>
        <div className="home-nav-badges">
          <span className="badge-pill">
            <Database size={13} /> Neon PostgreSQL
          </span>
          <span className="badge-pill">
            <Zap size={13} /> Groq Llama 3.3
          </span>
          <span className="badge-pill security">
            <LockKeyhole size={12} /> 100% Read Only
          </span>
        </div>
      </header>

      {/* Main Hero & Auth Split */}
      <main className="home-main">
        <div className="home-hero">
          <div className="hero-tag">
            <Sparkles size={14} />
            <span>Natural Language Database Analytics</span>
          </div>

          <h1 className="hero-title">
            Ask your database in plain English. Get <em>SQL & charts</em> instantly.
          </h1>

          <p className="hero-subtitle">
            Connect your PostgreSQL or SQLite database and query your data using natural language.
            Inspect the exact SQL executed, view automatic interactive charts, and keep full conversation history with guaranteed read-only safety.
          </p>

          <div className="hero-features">
            <div className="feature-item">
              <div className="feature-icon"><ShieldCheck size={18} /></div>
              <div>
                <strong>Guaranteed Read-Only Safety</strong>
                <p>Every query is AST-parsed by sqlglot and run in strict read-only transactions. Write operations are rejected before execution.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon"><Zap size={18} /></div>
              <div>
                <strong>Ultra-Fast Groq Inference</strong>
                <p>Powered by Llama 3.3 70B on Groq LPUs for sub-second query generation, automatic error correction, and dialect adaptation.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon"><BarChart3 size={18} /></div>
              <div>
                <strong>Smart Visualizations</strong>
                <p>Categorical distributions and time-series trends are automatically graphed with one-click toggles between charts, tables, and SQL.</p>
              </div>
            </div>
          </div>

          <div className="hero-samples">
            <span className="samples-label">Popular queries you can ask:</span>
            <div className="samples-grid">
              {SAMPLE_QUESTIONS.map((q, i) => (
                <div key={i} className="sample-chip">
                  <CheckCircle2 size={13} />
                  <span>{q}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Auth Box */}
        <div className="home-auth-column">
          <div className="auth-card">
            <div className="auth-header">
              <div className="brand"><Mark /><span>SQL Workspace</span></div>
              <span className="read-only"><LockKeyhole size={12} /> Secure login</span>
            </div>

            <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="auth-sub">
              {mode === 'login'
                ? 'Sign in to access your chat history and query databases.'
                : 'Sign up to start asking questions and generating insights.'}
            </p>

            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={mode === 'login' ? 'active' : ''}
                onClick={() => switchMode('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={mode === 'signup' ? 'active' : ''}
                onClick={() => switchMode('signup')}
              >
                Sign up
              </button>
            </div>

            <form className="auth-form" onSubmit={submit}>
              {mode === 'signup' && (
                <label>
                  <span>Full name</span>
                  <input
                    type="text"
                    placeholder="Ananya Rao"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    minLength={2}
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                <span>Email address</span>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={mode === 'signup' ? 6 : 1}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </label>

              {error && <div role="alert" className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
                <span>{mode === 'login' ? 'Sign in to Workspace' : 'Create account & Start'}</span>
              </button>
            </form>

            <div className="auth-footer-note">
              <span>Managed on Neon PostgreSQL · Zero-data-retention AI inference</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <p>SQL Query Agent · Read-Only Natural Language Analytics · Backed by Neon PostgreSQL & Groq</p>
      </footer>
    </div>
  )
}
