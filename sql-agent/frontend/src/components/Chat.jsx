import React, { useEffect, useRef, useState } from 'react'
import { ArrowUp, ArrowUpRight, Users, Trophy, TrendingUp, Database, LoaderCircle } from 'lucide-react'
import MessageBubble from './MessageBubble'

const ideas = [
  [Users, 'Customer count', 'How many customers do we have?'],
  [Trophy, 'Top customers', 'Top 5 customers by total spend'],
  [TrendingUp, 'Revenue trend', 'Revenue by month this year']
]

export default function Chat({ messages, busy, send, draft, setDraft }) {
  const end = useRef(null)
  const input = useRef(null)
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ block: 'end' }) }, [messages, busy])
  async function submit(value) {
    if (!value.trim() || busy) return
    const ok = await send(value.trim())
    if (ok) setDraft('')
    else setDraft(value)
    requestAnimationFrame(() => input.current?.focus())
  }
  return <><section className="chat-area" aria-label="Conversation">
    {!messages.length ? <div className="welcome"><div className="welcome-icon"><Database size={33}/><span/></div>
      <h1>Ask your data<br/><em>a question.</em></h1>
      <p>Explore your database in plain English.</p>
      <div className="ideas">{ideas.map(([Icon,title,q]) => <button key={q} disabled={busy} onClick={() => submit(q)}>
        <div><Icon size={19}/><ArrowUpRight size={14}/></div><strong>{title}</strong><span>{q}</span></button>)}</div>
    </div> : <div className="conversation">{messages.map((entry,i) => <MessageBubble key={i} entry={entry}/>)}
    {busy && <div role="status" className="loading"><LoaderCircle className="spin" size={16}/> Querying your database…</div>}<div ref={end}/></div>}
    </section><div className="composer-wrap"><form className="composer" onSubmit={e => { e.preventDefault(); submit(draft) }}>
      <textarea ref={input} aria-label="Question" placeholder="Ask a question about your data…" value={draft} maxLength={4000} disabled={busy}
        onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(draft) } }}/>
      <div className="composer-actions"><span><span className="key">↵</span> Enter to send</span><button aria-label="Send question" disabled={busy || !draft.trim()}><ArrowUp size={19}/></button></div>
    </form></div></>
}
