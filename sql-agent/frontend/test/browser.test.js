import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

test('built workspace renders results, SQL, errors and mobile navigation', async t => {
  const server = await preview({ preview: { host: '127.0.0.1', port: 0 } })
  t.after(() => new Promise(resolve => server.httpServer.close(resolve)))
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  t.after(() => browser.close())
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  let fail = false
  await page.route('**/api/schema', route => route.fulfill({ json: {
    tables: [{ name: 'orders', columns: [{ name: 'order_date', type: 'DATE' }] }]
  } }))
  await page.route('**/api/chat', route => route.fulfill(fail
    ? { status: 401, json: { detail: 'Groq rejected the API key.' } }
    : { json: { answer: 'Revenue rose between January and February.', columns: ['month','revenue_inr'],
        rows: [['2026-01',1100],['2026-02',1250]], sql_used: ['SELECT month, revenue_inr FROM monthly_revenue'] } }))
  await page.route('**/api/reset', route => route.fulfill({ json: { status: 'cleared' } }))
  await page.goto('http://127.0.0.1:' + server.httpServer.address().port)
  await page.getByRole('button', { name: /Revenue trend/ }).click()
  await page.locator('.plot svg.recharts-surface').first().waitFor()
  await page.getByRole('button', { name: 'table', exact: true }).click()
  await page.getByRole('cell', { name: '₹1,250', exact: true }).waitFor()
  await page.getByText('Show SQL', { exact: true }).click()
  await page.locator('pre').waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open sidebar' }).click()
  await page.getByRole('button', { name: /orders/ }).click()
  await page.getByText('order_date', { exact: true }).waitFor()
  await page.getByRole('button', { name: /Light appearance/ }).click()
  await page.getByRole('button', { name: 'New chat' }).click()
  fail = true
  await page.getByRole('button', { name: /Customer count/ }).click()
  await page.getByRole('alert').waitFor()
  assert.match(await page.getByRole('alert').textContent(), /Groq rejected/)
  assert.equal(await page.getByRole('textbox').inputValue(), 'How many customers do we have?')
  assert.deepEqual(errors, [])
  await page.close()
})
