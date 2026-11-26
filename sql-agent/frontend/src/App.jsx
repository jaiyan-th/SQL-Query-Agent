import React, { useEffect, useRef, useState } from 'react'
import { Menu, SquareTerminal, LockKeyhole, X } from 'lucide-react'
import { ask, getSchema, reset } from './api'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'

export default function App() {
  const session = useRef(crypto.randomUUID())
  const pending = useRef(false)
  const [messages, setMessages] = useState([])
  const [tables, setTables] = useState([])
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [light, setLight] = useState(() => localStorage.getItem('sql-agent-theme') === 'light')
  async function reload() {
    setState('loading')
    try { setTables((await getSchema()).tables); setState('ready') }
    catch (e) { setState('error'); setError(e.message) }
  }
  useEffect(() => { reload() }, [])
  useEffect(() => { localStorage.setItem('sql-agent-theme', light ? 'light' : 'dark') }, [light])
  async function send(text) {
    if (pending.current) return false
    pending.current = true
    setBusy(true); setError(''); setMessages(m => [...m, { user: text }])
    try { const reply = await ask(session.current, text); setMessages(m => [...m, reply]); return true }
    catch (e) { setMessages(m => m.slice(0,-1)); setError(e.message); return false }
    finally { pending.current = false; setBusy(false) }
  }
  async function newChat() {
    if (pending.current) return
    pending.current = true; setBusy(true)
    try { await reset(session.current); session.current = crypto.randomUUID(); setMessages([]); setDraft(''); setOpen(false); setError('') }
    catch (e) { setError(e.message) }
    finally { pending.current = false; setBusy(false) }
  }
  return <div className={'shell ' + (light ? 'light' : '')}>
    <Sidebar {...{ tables, state, reload, open, newChat, busy, light }} close={() => setOpen(false)} theme={() => setLight(v => !v)}/>
    <main><header><button className="mobile icon" aria-label="Open sidebar" onClick={() => setOpen(true)}><Menu/></button>
      <SquareTerminal size={17}/><strong>Query workspace</strong><span className="read-only"><LockKeyhole size={12}/> Read only</span></header>
      <Chat {...{ messages, busy, send, draft, setDraft }}/></main>
    {error && <div role="alert" className="toast">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
  </div>
}
