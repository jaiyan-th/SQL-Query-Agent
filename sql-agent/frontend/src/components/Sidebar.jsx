import React, { useState } from 'react'
import { Database, Layers3, Plus, ChevronRight, Table2, X, LogOut, RotateCw, PlugZap, MessageSquare, Trash2, History } from 'lucide-react'

export function Mark() {
  return <span className="brand-mark" aria-hidden="true"><Layers3 size={23} strokeWidth={2.4}/></span>
}

export default function Sidebar({ tables, state, reload, open, close, newChat, busy, user, onLogout, onOpenConnect, dbInfo, history = [], activeChatId, onSelectChat, onDeleteChat }) {
  const [expanded, setExpanded] = useState({})
  return <>
    {open && <button aria-label="Close sidebar" className="scrim" onClick={close}/>}
    <aside className={'rail ' + (open ? 'opened' : '')}>
      <div className="brand"><Mark/><span>SQL Query Agent</span><button onClick={close} className="mobile icon" aria-label="Close sidebar"><X/></button></div>
      <div className="rail-actions">
        <button className="new-chat" disabled={busy} onClick={newChat}><Plus size={17}/> New chat</button>
        <button className="connect-db-btn" disabled={busy} onClick={onOpenConnect}><PlugZap size={16}/> Connect database</button>
      </div>
      <div className="schema-head"><span>HISTORY</span><History size={14}/></div>
      <div className="history-list">
        {!history.length && <p className="history-empty">No recent chats.</p>}
        {history.map(item => (
          <div key={item.id} className={'history-row' + (item.id === activeChatId ? ' active' : '')}>
            <button type="button" className="history-select" disabled={busy} onClick={() => onSelectChat(item)} title={item.title}>
              <MessageSquare size={14}/>
              <span>{item.title}</span>
            </button>
            <button type="button" className="history-del" disabled={busy} aria-label={`Delete ${item.title}`} title="Delete chat" onClick={() => onDeleteChat(item.id)}>
              <Trash2 size={13}/>
            </button>
          </div>
        ))}
      </div>
      <div className="schema-head"><span>{dbInfo?.connected === false ? 'DISCONNECTED' : dbInfo?.label ? `${dbInfo.dialect.toUpperCase()} · ${dbInfo.label}` : 'DATABASE SCHEMA'}</span><Database size={14}/></div>
      <div className="schema-list">
        {state === 'loading' && <p>Loading schema…</p>}
        {state === 'error' && <button className="plain" onClick={reload}><RotateCw size={14}/> Retry schema</button>}
        {state === 'ready' && dbInfo?.connected === false && <p>No database connected.</p>}
        {state === 'ready' && dbInfo?.connected !== false && !tables.length && <p>No tables found.</p>}
        {tables.map(table => <div key={table.name}>
          <button className="schema-row" aria-expanded={!!expanded[table.name]} onClick={() => setExpanded({ ...expanded, [table.name]: !expanded[table.name] })}>
            <Table2 size={16}/><span>{table.name}</span><small>{table.columns.length}</small><ChevronRight size={13} className={expanded[table.name] ? 'rotated' : ''}/>
          </button>
          {expanded[table.name] && <ul>{table.columns.map(c => <li key={c.name}><span>{c.name}</span><small>{c.type}</small></li>)}</ul>}
        </div>)}
      </div>
      <div className="user-bar">
        <div className="user-meta">
          <strong>{user?.name || 'Analyst'}</strong>
          <span>{user?.email || ''}</span>
        </div>
        <button className="sign-out" onClick={onLogout} aria-label="Sign out" title="Sign out">
          <LogOut size={16}/>
        </button>
      </div>
    </aside>
  </>
}
