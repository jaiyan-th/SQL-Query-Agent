import React, { useState } from 'react'
import { Database, Upload, Link2, RotateCcw, Unplug, X, Loader2, ShieldCheck, Copy, Check, ChevronDown } from 'lucide-react'
import { connectDb, disconnectDb, resetDb, uploadDb } from '../api'

const PRESETS = [
  { label: 'Supabase', url: 'postgresql+psycopg2://sql_agent_reader:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require' },
  { label: 'Neon', url: 'postgresql+psycopg2://sql_agent_reader:PASSWORD@ep-ENDPOINT.REGION.aws.neon.tech/neondb?sslmode=require' },
  { label: 'MySQL', url: 'mysql+pymysql://sql_agent_reader:PASSWORD@localhost:3306/analytics' },
  { label: 'SQLite', url: 'sqlite:///retail.sqlite' },
]

const READONLY_SQL = `CREATE ROLE sql_agent_reader WITH LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
GRANT USAGE ON SCHEMA public TO sql_agent_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sql_agent_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO sql_agent_reader;`

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export default function ConnectDbModal({ open, onClose, onConnected, currentDb }) {
  const [tab, setTab] = useState('url')
  const [dbUrl, setDbUrl] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  if (!open) return null

  async function copySql() {
    try {
      await navigator.clipboard.writeText(READONLY_SQL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  async function handleConnectUrl(e) {
    e.preventDefault()
    if (busy || !dbUrl.trim()) return
    setBusy(true); setError('')
    try {
      const res = await connectDb(dbUrl.trim())
      onConnected(res)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (busy || !file) return
    setBusy(true); setError('')
    try {
      const buf = await file.arrayBuffer()
      const res = await uploadDb(file.name, toBase64(buf))
      onConnected(res)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleResetDemo() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const res = await resetDb()
      onConnected(res)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const res = await disconnectDb()
      onConnected(res)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="connect-db-title">
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-title">
            <Database size={18} />
            <h2 id="connect-db-title">Connect Read-Only Database</h2>
          </div>
          <button type="button" className="icon" aria-label="Close modal" onClick={onClose}><X size={18} /></button>
        </div>

        <p className="modal-sub">
          Active: {currentDb?.connected === false ? (
            <strong>Disconnected</strong>
          ) : (
            <><strong>{currentDb?.dialect || 'sqlite'}</strong> · <code>{currentDb?.label || 'retail.sqlite'}</code></>
          )}
        </p>

        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'url'} className={tab === 'url' ? 'active' : ''} onClick={() => { setTab('url'); setError('') }}>
            <Link2 size={14} /> Connection URL
          </button>
          <button type="button" role="tab" aria-selected={tab === 'upload'} className={tab === 'upload' ? 'active' : ''} onClick={() => { setTab('upload'); setError('') }}>
            <Upload size={14} /> Upload SQLite
          </button>
        </div>

        {tab === 'url' ? (
          <form className="auth-form" onSubmit={handleConnectUrl}>
            <div className="preset-row">
              <span>Templates:</span>
              {PRESETS.map(p => (
                <button key={p.label} type="button" className="preset-chip" onClick={() => setDbUrl(p.url)}>{p.label}</button>
              ))}
            </div>
            <label>
              <span>SQLAlchemy Read-Only Connection URL</span>
              <input
                type="text"
                placeholder="postgresql+psycopg2://sql_agent_reader:pass@host:5432/postgres?sslmode=require"
                value={dbUrl}
                onChange={e => setDbUrl(e.target.value)}
                required
              />
            </label>
            <div className="ro-note">
              <ShieldCheck size={15} />
              <span><strong>Automatic read-only:</strong> Just paste any database URL — the backend locks the session to read-only (<code>READ ONLY</code> transaction + <code>mode=ro</code>) and <code>sqlglot</code> blocks all non-<code>SELECT</code> queries.</span>
            </div>

            <details className="db-guide">
              <summary>
                <span>Optional: Create a dedicated read-only user in Supabase or Neon</span>
                <ChevronDown size={14} />
              </summary>
              <div className="db-guide-body">
                <ol>
                  <li>Open the <strong>SQL Editor</strong> in your Supabase or Neon dashboard and run:</li>
                </ol>
                <div className="guide-code-wrap">
                  <button type="button" className="copy-sql-btn" onClick={copySql} aria-label="Copy SQL">
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <pre className="guide-code">{READONLY_SQL}</pre>
                </div>
                <ol start={2}>
                  <li>Click the <strong>Supabase</strong> or <strong>Neon</strong> template above, replace <code>PASSWORD</code> and host details, and keep <code>?sslmode=require</code>.</li>
                  <li>URL-encode special characters in your password (e.g. <code>@</code> → <code>%40</code>).</li>
                </ol>
              </div>
            </details>

            {error && <div role="alert" className="auth-error">{error}</div>}
            <div className="modal-actions">
              {currentDb?.connected !== false && (
                <button type="button" className="btn-secondary" disabled={busy} onClick={handleDisconnect}><Unplug size={14} /> Disconnect</button>
              )}
              <button type="button" className="btn-secondary" disabled={busy} onClick={handleResetDemo}><RotateCcw size={14} /> Use Default DB</button>
              <button type="submit" className="auth-submit" disabled={busy || !dbUrl.trim()}>
                {busy && <Loader2 size={15} className="spin" />} Connect Read-Only
              </button>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleUpload}>
            <label>
              <span>Choose a SQLite file (.sqlite, .db, .sqlite3 — max 25 MB)</span>
              <input
                type="file"
                accept=".sqlite,.db,.sqlite3"
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
              />
            </label>
            <div className="ro-note">
              <ShieldCheck size={15} />
              <span>Uploaded SQLite files are opened strictly with <code>?mode=ro</code> and <code>PRAGMA query_only=ON</code>.</span>
            </div>
            {error && <div role="alert" className="auth-error">{error}</div>}
            <div className="modal-actions">
              {currentDb?.connected !== false && (
                <button type="button" className="btn-secondary" disabled={busy} onClick={handleDisconnect}><Unplug size={14} /> Disconnect</button>
              )}
              <button type="button" className="btn-secondary" disabled={busy} onClick={handleResetDemo}><RotateCcw size={14} /> Use Default DB</button>
              <button type="submit" className="auth-submit" disabled={busy || !file}>
                {busy && <Loader2 size={15} className="spin" />} Upload & Connect
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
