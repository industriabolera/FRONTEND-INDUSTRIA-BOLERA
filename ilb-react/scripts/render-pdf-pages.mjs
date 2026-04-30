import { chromium } from 'playwright'
import { resolve } from 'node:path'

const PDF = resolve('/Users/angietatianapena/ILB-FRONTEND/ilb-react/public/documents/Manual-Admin-La-Industria-Bolera.pdf')

const pages = process.argv.slice(2).map(n => parseInt(n, 10)).filter(Number.isFinite)
if (!pages.length) {
  console.error('uso: node render-pdf-pages.mjs <pageNum> ...')
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 850, height: 1200 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto('file://' + PDF, { waitUntil: 'load' })
await page.waitForTimeout(2500)
for (const n of pages) {
  await page.goto('file://' + PDF + '#page=' + n, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  const out = `/tmp/manual_view_p${n}.png`
  await page.screenshot({ path: out })
  console.log('wrote', out)
}
await browser.close()
