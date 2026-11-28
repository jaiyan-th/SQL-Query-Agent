import React, { useEffect, useRef, useState } from 'react'
import { Menu, SquareTerminal, LockKeyhole, X } from 'lucide-react'
import { ask, getMe, getSchema, getToken, reset, setToken } from './api'
import AuthPage from './components/AuthPage'
import ConnectDbModal from './components/ConnectDbModal'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'

const HISTORY_KEY_PREFIX = 'sql-agent-history:'
const MAX_HISTORY = 30

function loadHistory(userId) {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY_PREFIX + userId)
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(userId, items) {
  if (!userId) return
  try {
    localStorage.setItem(HISTORY_KEY_PREFIX + userId, JSON.stringify(items.slice(0, MAX_HISTORY)))
  } catch {}
}

function chatTitle(messages) {
  const first = messages.find(m => m.user)?.user?.trim() || 'Untitled query'
  return first.length > 42 ? first.slice(0, 42) + '…' : first
}

export default function App() {
  const session = useRef(crypto.randomUUID())
  const pending = useRef(false)
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(() => !!getToken())
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [activeChatId, setActiveChatId] = useState(session.current)
  const [tables, setTables] = useState([])
  const [dbInfo, setDbInfo] = useState(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  function upsertHistory(userId, chatId, nextMessages) {
    if (!userId || !nextMessages.length) return
    setHistory(prev => {
      const entry = { id: chatId, title: chatTitle(nextMessages), messages: nextMessages, updatedAt: Date.now() }
      const next = [entry, ...prev.filter(item => item.id !== chatId)].slice(0, MAX_HISTORY)
      saveHistory(userId, next)
      return next
    })
  }

  function logout() {
    setToken('')
    setUser(null)
    setMessages([])
    setHistory([])
    setTables([])
    setDraft('')
    setOpen(false)
    setError('')
    const id = crypto.randomUUID()
    session.current = id
    setActiveChatId(id)
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
    const id = crypto.randomUUID()
    session.current = id
    setActiveChatId(id)
  }

  useEffect(() => {
    if (!getToken()) { setCheckingAuth(false); return }
    getMe()
      .then(res => { setUser(res.user); setHistory(loadHistory(res.user?.id)); reload() })
      .catch(() => { setToken(''); setUser(null) })
      .finally(() => setCheckingAuth(false))
  }, [])

  function handleAuth(result) {
    setToken(result.token)
    setUser(result.user)
    setHistory(loadHistory(result.user?.id))
    setError('')
    reload()
  }

  async function send(text) {
    if (pending.current) return false
    pending.current = true
    const chatId = session.current
    const withUser = [...messages, { user: text }]
    setBusy(true); setError(''); setMessages(withUser)
    try {
      const reply = await ask(chatId, text)
      const complete = [...withUser, reply]
      setMessages(complete)
      upsertHistory(user?.id, chatId, complete)
      return true
    }
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
    try {
      await reset(session.current)
      const id = crypto.randomUUID()
      session.current = id
      setActiveChatId(id)
      setMessages([]); setDraft(''); setOpen(false); setError('')
    }
    catch (e) {
      if (e.status === 401) { logout(); return }
      setError(e.message)
    }
    finally { pending.current = false; setBusy(false) }
  }

  function selectChat(item) {
    if (pending.current || busy) return
    session.current = item.id
    setActiveChatId(item.id)
    setMessages(item.messages || [])
    setDraft('')
    setOpen(false)
    setError('')
  }

  function deleteChat(chatId) {
    setHistory(prev => {
      const next = prev.filter(item => item.id !== chatId)
      saveHistory(user?.id, next)
      return next
    })
    if (activeChatId === chatId) {
      const id = crypto.randomUUID()
      session.current = id
      setActiveChatId(id)
      setMessages([])
    }
  }

  if (checkingAuth) {
    return <div className="shell light auth-page"><p className="plain">Loading workspace…</p></div>
  }

  if (!user) {
    return <div className="shell light"><AuthPage onAuth={handleAuth} /></div>
  }

  return <div className="shell light">
    <Sidebar {...{ tables, state, reload, open, newChat, busy, user, dbInfo, history, activeChatId }} onSelectChat={selectChat} onDeleteChat={deleteChat} onOpenConnect={() => setConnectOpen(true)} onLogout={logout} close={() => setOpen(false)} />
    <main><header><button className="mobile icon" aria-label="Open sidebar" onClick={() => setOpen(true)}><Menu/></button>
      <SquareTerminal size={17}/><strong>Query workspace</strong>
      <button type="button" className="read-only" onClick={() => setConnectOpen(true)} title="Connect or disconnect read-only database">
        <LockKeyhole size={12}/> {dbInfo?.connected === false ? 'Disconnected' : `Read only${dbInfo?.dialect ? ` · ${dbInfo.dialect}` : ''}`}
      </button></header>
      <Chat {...{ messages, busy, send, draft, setDraft }}/></main>
    <ConnectDbModal open={connectOpen} onClose={() => setConnectOpen(false)} onConnected={handleDbConnected} currentDb={dbInfo} />
    {error && <div role="alert" className="toast">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
  </div>
}
