import React from 'react'
import { displayValue } from '../format'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function ResultChart({ spec }) {
  const Plot = spec.date ? LineChart : BarChart
  return <div className="plot" role="img" aria-label={spec.measure + ' by category'}><ResponsiveContainer width="100%" height={230}><Plot data={spec.series} margin={{ top: 14, right: 18, bottom: 4, left: 8 }}>
    <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--border)"/>
    <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} minTickGap={20}/>
    <YAxis width={60} tick={{ fill: 'var(--muted)', fontSize: 11 }}/>
    <Tooltip formatter={value => displayValue(value, spec.measure)} contentStyle={{ background: 'var(--panel)', color: 'var(--fg)', border: '1px solid var(--border)' }}/>
    {spec.date ? <Line dataKey="value" name={spec.measure} stroke="var(--accent)" strokeWidth={2.5}/> : <Bar dataKey="value" name={spec.measure} fill="var(--accent)" radius={[3,3,0,0]}/>}
  </Plot></ResponsiveContainer></div>
}
