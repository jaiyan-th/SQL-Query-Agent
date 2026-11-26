import React, { lazy, Suspense, useState } from 'react'
import { Code2, Table2, ChartColumn } from 'lucide-react'
import { Mark } from './Sidebar'
import ResultTable from './ResultTable'
import { chartSpec } from '../chart'

const ResultChart = lazy(() => import('./ResultChart'))

export default function MessageBubble({ entry }) {
  const { user, answer, rows = [], columns = [], sql_used = [] } = entry
  const spec = chartSpec(columns, rows)
  const [view, setView] = useState(spec ? 'chart' : 'table')
  if (user) return <div className="user-bubble">{user}</div>
  return <article className="answer"><div className="answer-head"><Mark/>SQL Query Agent</div><p>{answer}</p>
    {!!columns.length && <div className="results">
      <div className="result-head"><span>{entry.truncated ? 'Showing the first 100 rows' : `${rows.length} ${rows.length === 1 ? 'row' : 'rows'} returned`}</span>
      {spec && <div className="tabs">{[['table',Table2],['chart',ChartColumn]].map(([v,Icon]) => <button key={v} aria-pressed={v === view} onClick={() => setView(v)}><Icon size={13}/>{v}</button>)}</div>}</div>
      {spec && view === 'chart'
        ? <Suspense fallback={<p role="status" className="empty-rows">Loading chart…</p>}><ResultChart spec={spec}/></Suspense>
        : <ResultTable columns={columns} rows={rows}/>}
    </div>}
    {!!sql_used.length && <details><summary><Code2 size={15}/> Show SQL</summary>{sql_used.map((sql,i) => <pre key={i}>{sql}</pre>)}</details>}
  </article>
}
