import React, { useEffect, useRef, useState } from 'react'
import { Menu, SquareTerminal, LockKeyhole, X } from 'lucide-react'
import { ask, getMe, getSchema, getToken, reset, setToken } from './api'
import AuthPage from './components/AuthPage'
import ConnectDbModal from './components/ConnectDbModal'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'

export default function App() {
  const session = useRef(crypto.randomUUID())
  const pending = useRef(false)
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(() => !!getToken())
  const [messages, setMessages] = useState([])
  const [tables, setTables] = useState([])
  const [dbInfo, setDbInfo] = useState(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  function logout() {
    setToken('')
    setUser(null)
    setMessages([])
    setTables([])
    setDraft('')
    setOpen(false)
    setError('')
    session.current = crypto.randomUUID()
  }

  async function reload() {
    setState('loading')
    try {
      const res = await getSchema()
      setTables(res.tables)
      if (res.db) setDbInfo(res.db)
      setState('ready')
    } catch (e) {
      if (e.status === 401) { logout(); return }
      setState('error')
      setError(e.message)
    }
  }

  function handleDbConnected(res) {
    setTables(res.tables || [])
    if (res.db) setDbInfo(res.db)
    setState('ready')
    setMessages([])
    setDraft('')
    setOpen(false)
    reset(session.current).catch(() => {})
    session.current = crypto.randomUUID()
  }

  useEffect(() => {
    if (!getToken()) { setCheckingAuth(false); return }
    getMe()
      .then(res => { setUser(res.user); reload() })
      .catch(() => { setToken(''); setUser(null) })
      .finally(() => setCheckingAuth(false))
  }, [])

  function handleAuth(result) {
    setToken(result.token)
    setUser(result.user)
    setError('')
    reload()
  }

  async function send(text) {
    if (pending.current) return false
    pending.current = true
    setBusy(true); setError(''); setMessages(m => [...m, { user: text }])
    try { const reply = await ask(session.current, text); setMessages(m => [...m, reply]); return true }
    catch (e) {
      setMessages(m => m.slice(0, -1))
      if (e.status === 401) { logout(); return false }
      setError(e.message); return false
    }
    finally { pending.current = false; setBusy(false) }
  }

  async function newChat() {
    if (pending.current) return
    pending.current = true; setBusy(true)
    try { await reset(session.current); session.current = crypto.randomUUID(); setMessages([]); setDraft(''); setOpen(false); setError('') }
    catch (e) {
      if (e.status === 401) { logout(); return }
      setError(e.message)
    }
    finally { pending.current = false; setBusy(false) }
  }

  if (checkingAuth) {
    return <div className="shell light auth-page"><p className="plain">Loading workspace…</p></div>
  }

  if (!user) {
    return <div className="shell light"><AuthPage onAuth={handleAuth} /></div>
  }

  return <div className="shell light">
    <Sidebar {...{ tables, state, reload, open, newChat, busy, user, dbInfo }} onOpenConnect={() => setConnectOpen(true)} onLogout={logout} close={() => setOpen(false)} />
    <main><header><button className="mobile icon" aria-label="Open sidebar" onClick={() => setOpen(true)}><Menu/></button>
      <SquareTerminal size={17}/><strong>Query workspace</strong>
      <button type="button" className="read-only" onClick={() => setConnectOpen(true)} title="Connect another read-only database">
        <LockKeyhole size={12}/> Read only{dbInfo ? ` · ${dbInfo.dialect}` : ''}
      </button></header>
      <Chat {...{ messages, busy, send, draft, setDraft }}/></main>
    <ConnectDbModal open={connectOpen} onClose={() => setConnectOpen(false)} onConnected={handleDbConnected} currentDb={dbInfo} />
    {error && <div role="alert" className="toast">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
  </div>
}
