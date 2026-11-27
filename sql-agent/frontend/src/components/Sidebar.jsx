import React, { useState } from 'react'
import { Database, Layers3, Plus, ChevronRight, Table2, X, LogOut, RotateCw } from 'lucide-react'

export function Mark() {
  return <span className="brand-mark" aria-hidden="true"><Layers3 size={23} strokeWidth={2.4}/></span>
}

export default function Sidebar({ tables, state, reload, open, close, newChat, busy, user, onLogout }) {
  const [expanded, setExpanded] = useState({})
  return <>
    {open && <button aria-label="Close sidebar" className="scrim" onClick={close}/>}
    <aside className={'rail ' + (open ? 'opened' : '')}>
      <div className="brand"><Mark/><span>SQL Query Agent</span><button onClick={close} className="mobile icon" aria-label="Close sidebar"><X/></button></div>
      <button className="new-chat" disabled={busy} onClick={newChat}><Plus size={17}/> New chat</button>
      <div className="schema-head"><span>DATABASE SCHEMA</span><Database size={14}/></div>
      <div className="schema-list">
        {state === 'loading' && <p>Loading schema…</p>}
        {state === 'error' && <button className="plain" onClick={reload}><RotateCw size={14}/> Retry schema</button>}
        {state === 'ready' && !tables.length && <p>No tables found.</p>}
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
