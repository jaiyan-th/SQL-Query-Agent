import React from 'react'
import { displayValue } from '../format'
export default function ResultTable({ columns, rows }) {
  return <div className="table-scroll" tabIndex={0} aria-label="Query results"><table>
    <thead><tr>{columns.map((c,i) => <th key={i}>{c}</th>)}</tr></thead>
    <tbody>{rows.map((row,i) => <tr key={i}>{row.map((v,j) => <td key={j}>{displayValue(v, columns[j])}</td>)}</tr>)}</tbody>
  </table>{!rows.length && <p className="empty-rows">No matching rows.</p>}</div>
}
