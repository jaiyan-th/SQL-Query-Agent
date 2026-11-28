import React, { useState } from 'react'
import { LockKeyhole, ArrowRight, Loader2, ArrowLeft } from 'lucide-react'
import { login, signup } from '../api'
import { Mark } from './Sidebar'

export default function AuthPage({ onAuth, onBack, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
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
    <div className="auth-page">
      <div className="auth-card">
        {onBack && (
          <button type="button" className="auth-back-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to home</span>
          </button>
        )}

        <div className="auth-header">
          <div className="brand"><Mark /><span>SQL Query Agent</span></div>
          <span className="read-only"><LockKeyhole size={12} /> Read only</span>
        </div>

        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-sub">
          {mode === 'login'
            ? 'Sign in to access your chat history and query databases.'
            : 'Sign up to start exploring tables, charts, and SQL insights.'}
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
            <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
