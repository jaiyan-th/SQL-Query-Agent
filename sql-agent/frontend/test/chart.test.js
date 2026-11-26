import assert from 'node:assert/strict'
import test from 'node:test'
import { chartSpec } from '../src/chart.js'

test('monthly revenue uses a chronological line series', () => {
  const spec = chartSpec(['month', 'revenue_inr'], [['2026-02', 1500], ['2026-01', 1000]])
  assert.equal(spec.date, true)
  assert.equal(spec.measure, 'revenue_inr')
  assert.deepEqual(spec.series.map(point => point.label), ['2026-01', '2026-02'])
})

test('ranked customer spend keeps its order in a bar series', () => {
  const spec = chartSpec(['spend', 'customer'], [[1200, 'Kavya'], [800, 'Ravi']])
  assert.equal(spec.date, false)
  assert.deepEqual(spec.series[0], { label: 'Kavya', value: 1200 })
})

test('counts, empty results and incompatible series use the table', () => {
  assert.equal(chartSpec(['count'], [[18]]), null)
  assert.equal(chartSpec(['month','revenue'], []), null)
  assert.equal(chartSpec(['id','count'], [[1,5]]), null)
})
