export function chartSpec(columns, rows) {
  if (columns.length !== 2 || !rows.length) return null
  const numeric = [0,1].find(i => rows.some(r => typeof r[i] === 'number') && rows.every(r => r[i] == null || typeof r[i] === 'number'))
  if (numeric == null) return null
  const label = 1 - numeric
  if (!rows.every(r => typeof r[label] === 'string')) return null
  const series = rows.map(r => ({ label: r[label], value: r[numeric] }))
  const date = series.every(d => /^\d{4}-\d{2}(-\d{2})?/.test(d.label))
  if (date) series.sort((a,b) => a.label.localeCompare(b.label))
  return { series, date, measure: columns[numeric] }
}

