#!/usr/bin/env node
// ─── BUNDLE SIZE BUDGET ─────────────────────────────────────
//
// Runs after `npm run build` in CI. Walks `dist/assets/*.js` and
// fails if any file exceeds the budget below. Catches accidental
// regressions like importing a heavy library at the top level
// instead of code-splitting it.
//
// Budgets are bytes pre-gzip. The current biggest chunk is
// TradingViewChart at 181 KB; index sits around 252 KB. The
// generous-but-firm limits below mean a 10-15% bloat triggers a
// failure long before it ships.
//
// To raise a budget: change the line below, commit, justify in the
// commit message. Better than silently letting bundles grow.

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Per-file budgets. Each pattern is matched against the basename
// (with hash) of files in dist/assets/. The first match wins, so
// list specific patterns before the catch-all.
const BUDGETS = [
  // Vendor / shared chunks
  { pattern: /^TradingViewChart-/,            label: 'TradingViewChart',  maxBytes: 200_000 },
  { pattern: /^index-/,                       label: 'index (entry)',     maxBytes: 280_000 },
  { pattern: /^ChainMonitor-/,                label: 'ChainMonitor',      maxBytes:  40_000 },
  { pattern: /^chain-/,                       label: 'chain pipeline',    maxBytes:  40_000 },
  // Rolldown sometimes names the cross-screen shared-helpers chunk
  // after one of its exports (e.g. NotFinancialAdviceBanner) when
  // that export is the first one alphabetically. The actual content
  // is the audit logger + 3-screen shared code. 40 KB headroom.
  { pattern: /^NotFinancialAdviceBanner-/,    label: 'shared helpers',    maxBytes:  40_000 },
  { pattern: /^Backtest-/,                    label: 'Backtest',          maxBytes:  30_000 },
  { pattern: /^registry-/,                    label: 'provider registry', maxBytes:  30_000 },
  // Catch-all for any other code-split screen — none should exceed 30 KB.
  { pattern: /\.js$/,                         label: 'screen chunk',      maxBytes:  30_000 },
]

const DIST_ASSETS = 'dist/assets'

const files = readdirSync(DIST_ASSETS).filter((f) => f.endsWith('.js'))
let failures = 0
const rows = []

for (const file of files) {
  const fullPath = join(DIST_ASSETS, file)
  const size = statSync(fullPath).size
  const budget = BUDGETS.find((b) => b.pattern.test(file))
  if (!budget) continue
  const overBy = size - budget.maxBytes
  const status = overBy > 0 ? 'FAIL' : 'OK'
  rows.push({ file, size, budgetLabel: budget.label, max: budget.maxBytes, overBy, status })
  if (overBy > 0) failures++
}

// Sort by size desc for easier scanning.
rows.sort((a, b) => b.size - a.size)

const fmt = (n) => (n / 1024).toFixed(1) + ' KB'
const pct = (n, max) => ((n / max) * 100).toFixed(0) + '%'

console.log('\nBundle size budget check')
console.log('========================')
for (const r of rows) {
  const usage = pct(r.size, r.max)
  const overText = r.overBy > 0 ? `  +${fmt(r.overBy)} OVER` : ''
  console.log(
    `[${r.status}] ${r.budgetLabel.padEnd(22)} ${fmt(r.size).padStart(10)} / ${fmt(r.max).padEnd(10)}  (${usage.padStart(4)})${overText}  ${r.file}`,
  )
}

if (failures > 0) {
  console.error(`\n❌ ${failures} bundle(s) exceed their budget. See above.`)
  console.error('   Either trim the chunk or update the budget in scripts/check-bundle-budget.mjs.')
  process.exit(1)
}

console.log(`\n✅ All ${rows.length} bundle(s) within budget.\n`)
