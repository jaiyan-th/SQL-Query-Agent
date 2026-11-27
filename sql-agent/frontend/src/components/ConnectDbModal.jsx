import React, { useState } from 'react'
import { Database, Upload, Link2, RotateCcw, X, Loader2, ShieldCheck } from 'lucide-react'
import { connectDb, resetDb, uploadDb } from '../api'

const PRESETS = [
  { label: 'PostgreSQL', url: 'postgresql+psycopg2://readonly_user:password@localhost:5432/analytics' },
  { label: 'MySQL', url: 'mysql+pymysql://readonly_user:password@localhost:3306/analytics' },
  { label: 'SQLite', url: 'sqlite:///retail.sqlite' },
]

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

  if (!open) return null

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
          Active: <strong>{currentDb?.dialect || 'sqlite'}</strong> · <code>{currentDb?.label || 'retail.sqlite'}</code>
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
                placeholder="postgresql+psycopg2://reader:pass@host:5432/db"
                value={dbUrl}
                onChange={e => setDbUrl(e.target.value)}
                required
              />
            </label>
            <div className="ro-note">
              <ShieldCheck size={15} />
              <span>Queries run inside read-only transactions (<code>SET TRANSACTION READ ONLY</code> / <code>mode=ro</code>) and are parsed with <code>sqlglot</code> to allow only <code>SELECT</code>.</span>
            </div>
            {error && <div role="alert" className="auth-error">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" disabled={busy} onClick={handleResetDemo}><RotateCcw size={14} /> Use Demo DB</button>
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
              <button type="button" className="btn-secondary" disabled={busy} onClick={handleResetDemo}><RotateCcw size={14} /> Use Demo DB</button>
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
