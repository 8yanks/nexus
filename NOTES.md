# Session notes

## 2026-04-26 (cont.) — NFA banner + bundle budget + glossary

User: continuing the autonomous loop "on a pas de limite de temps".
Three more independent ships from the READINESS.md gap list.

### Shipped — `f1c7ec3` NFA banner + budget check + GLOSSARY

1. **NotFinancialAdviceBanner** — slim role=note strip, hand-rolled
   triangle SVG (inlined to avoid pulling lucide-react into shared
   chunks). Mounted on ChainMonitor / Trader / Sentinel with
   context-string tailored to each screen's specific risk angle.
   Pairs with the always-on PAPER TRADING TopBar badge from 952a615.

2. **Bundle size budget** — `scripts/check-bundle-budget.mjs` walks
   `dist/assets/*.js` and fails on any chunk over budget. Wired into
   CI as a step after build. The first run actually caught a
   regression I was about to ship — the NFA banner pulled
   lucide-react into a 32 KB shared chunk. Inlining the SVG fixed
   it. The catch was the whole point of adding the budget.

3. **GLOSSARY.md** — 200+ lines explaining every technical term
   in plain French: indicators (RSI/EMA/BB/DC), patterns, structure,
   AI orchestrator pipeline, sentinel veto, backtest stats,
   providers, UI bits. Closes the "glossaire (todo)" entry in
   READINESS.md.

### Status

- Tests: **943 / 943** across **95 files** (+5 — NFA banner).
- Type-check + build clean.
- All 32 bundles within budget.
- Branch: `ai-schemas-and-audit`.

### READINESS.md updates

Marked completed: NFA disclaimer, glossary, performance budgets.
Stats refreshed (943/95).

Commit:
- `f1c7ec3` feat(legal+infra+docs): NFA banner + bundle budget + glossary

---

## 2026-04-26 — Pre-launch sprint: README + CI + PAPER badge + patterns→signals + nav loop + recent-bar

User: "tu peux continuer hein? on a pas de limite de temps aujourd'hui".
Six independent ships from the READINESS.md gaps, each closing a
high-value blocker without needing API keys or backend work.

### Shipped — `952a615` Real README + GitHub Actions CI + PAPER TRADING badge

1. **README.md** — replaced default Vite template (a links page to
   the Vite plugin docs) with a real overview: what it does, asset
   coverage table, getting-started + optional .env keys, scripts
   table, ASCII architecture diagram, repo layout, status, disclaimer.
2. **`.github/workflows/ci.yml`** — lint → type-check → test → build
   on push/PR. Concurrency cancellation, Node 22, uploads dist/ as
   debug artifact (7-day retention).
3. **PAPER TRADING badge** — always-on yellow chip in TopBar, before
   ANALYST MODE. Non-interactive span with help cursor, hover tooltip
   explains the meaning. Sits in the chrome so screenshots /
   shoulder-surfers can never miss the fact that nothing places real
   orders.

### Shipped — `4e3f6ce` Patterns → SignalEvent stream

Closed the "patterns are detected but only displayed" gap. The 6
PatternType variants (HS, inv HS, double top, double bottom,
ascending/descending triangle) now emit proper SignalEvents that
flow through the journal/alert/AI orchestrator pipeline.

- 6 new `SignalType` entries (PATTERN_*) + 6 SIGNAL_CONFIGS.
- New threshold `PATTERN_MIN_CONFIDENCE = 0.6` (higher floor than
  the detector's 0.3 keep-or-drop, so noisy detections don't surface
  as actionable).
- `src/signals/patterns-bridge.ts` (NEW) — `patternsToSignals(id, ps,
  price)` filters by min confidence, maps PatternType → SignalType,
  embeds neckline in the description, threads current price.
- `refreshAll` now runs pattern detection BEFORE addSignals so
  pattern signals land in the same batch as technical signals.
- Backtest config picker exposes the 6 new pattern signal types as
  selectable entries.

### Shipped — `56d3be1` Detail ↔ Backtest navigation loop closed

Mirror of `745aaac`'s "view on chart →" but the other direction.

1. **Detail → Backtest button** in the ScreenHeader actions slot.
   Click loads the persisted Backtest config, swaps in the current
   Detail instrument, writes back to localStorage, then navigates.
   Backtest mounts fresh (lazy ScreenRouter) and reads the new
   instrumentId — user's tuned stops/take-profit/signals carry over.
2. **Recent backtests chip strip** in Backtest results column. One
   chip per stored result, color-coded by return %, click flips the
   displayed result without re-running. Hidden when 0-1 stored
   results (no value).

### Status

- Tests: **938 / 938** across **94 files** (+18 from 920 — 3 PAPER
  badge, 10 patterns-bridge, 1 Detail→Backtest, 4 recent-bar).
- Type-check + build clean.
- CI workflow ready to run on first PR.
- Branch: `ai-schemas-and-audit`.

### READINESS.md updates

Marked completed: README, quickstart, architecture diagram, CI,
PAPER TRADING disclaimer, patterns→signals coverage, cross-instruments
backtest view. Stats refreshed (938/94/252KB).

Commits this session segment (newest first):
- `56d3be1` feat(navigation): Detail ↔ Backtest loop
- `4e3f6ce` feat(signals): patterns → SignalEvent stream
- `952a615` feat(launch): README + CI + PAPER TRADING badge

---

## 2026-04-25 (post-deadline cont.) — DC midline + cleanup + READINESS.md

User restarted the loop with "continue jusqu'à la limite, fais tout
ce que tu as prévu, et prépare une checklist visuellement plaisante
pour moi et mon associé". Three small ships + a doc.

### Shipped — `01f82ae` Donchian midline cross signals + Backtest picker

- New signal types `DC_MID_CROSS_UP` / `DC_MID_CROSS_DOWN` (default
  strength 0.55 — softer than the breakout, used as early trend hints
  before a breakout confirms).
- `detectDonchianMidCross` mirrors the EMA cross pattern: needs prev
  + curr analytics, fires once on the bar where price transitions
  across the Donchian midline. Approximates "previous price" with
  `prevAnalytics.ema20` since we don't carry a `prevPrice` arg.
- All four DC signal types now exposed in the Backtest config picker
  (`SIGNAL_OPTIONS`). They were detectable but not pickable for
  backtests.
- 5 new tests on the cross detector.

### Shipped — `a7f1ea1` Cleanup deprecated PositionManager.open_()

The alias was marked `@deprecated` and only one test consumed it.
Test now uses `listOpen()`, alias removed.

### Shipped — `a2454a3` READINESS.md — pre-launch checklist

New top-level doc (FR) for Yanis + associate. Covers:
- One-line verdict with emoji status per aspect
- Shipped + working features (data, charts, indicators, signals,
  backtest, AI, sentinel, trader, UI, infra)
- Partial features with next-steps
- What's missing for mise en service (security, multi-user,
  deployment, real data sources, legal, docs, tests, perf)
- Suggested 4-sprint roadmap

`NOTES.md` remains the line-by-line source of truth; `READINESS.md`
is the decision-making view for the team.

### Status

- Tests: **920/920** across 93 files (+5 from 915 — DC midline cross detector).
- Type-check + build clean.
- Branch: `ai-schemas-and-audit`.

Commits this session segment (newest first):
- `a2454a3` docs: READINESS.md
- `a7f1ea1` chore(trader): remove deprecated open_()
- `01f82ae` feat(signals): DC midline cross + Backtest picker
- `7225b04` feat(signals): Donchian breakout

---

## 2026-04-25 (post-deadline) — Donchian breakout signals

User said "you can restart" past the 19h deadline. Picked the most
concrete carry-forward: turning the rolling Donchian channel (now
visualisable as a chart overlay) into an actionable signal source.

### Shipped — `7225b04` DC_BREAKOUT_UP / DC_BREAKOUT_DOWN

Same shape as the BB breakout signals, with one subtle difference: the
detection channel uses the prior N bars (excluding the current bar).
If we used the same `calcDonchian` that powers the chart overlay
(which includes the current bar so the line traces around recent
action), then a fresh new high would always have
`current.high == channel.upper` and `price > upper` could never fire.

Plumbing:
- `SignalType` union (canonical at `packages/shared-types/src/signal.ts`,
  mirrored in `src/types/signal.ts`) gains the two new entries.
- `SIGNAL_CONFIGS` entries — bullish / bearish, default strength 0.85
  (slightly stronger than BB breakout because Donchian fires less
  often on noise).
- `SIGNAL_THRESHOLDS.DC_BREAKOUT_PERIOD = 20` — canonical "Turtle"
  period.
- `calcDonchianBreakout(candles, period=20)` in
  `analytics/indicators.ts` — N-bar high/low over the bars STRICTLY
  BEFORE the current. Requires `period+1` bars total.
- `AnalyticsResult.donchianBreakout: DonchianChannel | null` —
  populated alongside the existing `donchian` field. Two fields,
  different purposes (overlay vs detect).
- `detectDonchianBreakout` follows the BB pattern: stateful firing
  while price stays outside the prior range; dedup is the journal's
  job.

### Status

- Tests: **915/915** across 93 files (+10 from 905 — 4 calc, 6 detector).
- Type-check + build clean.
- Branch: `ai-schemas-and-audit`.

Commit:
- `7225b04` feat(signals): Donchian breakout

---

## 2026-04-25 — Session close at 19h deadline

Loop closed at the user's 19h deadline. Eight features shipped over
the day (real-time pipeline fixes already documented separately at
the bottom of this file, then the seven listed below from the
multi-TF onwards). Every commit is pushed to origin; tests, type-check,
and build are green at every milestone.

### Feature commits this day (oldest → newest)

1. `4ec153e` fix(chart): snap to real-time after setData
2. `1b14e81` feat(chart): live-tick pulse indicator
3. `4a1b878` feat(ws): heartbeat watchdog
4. `0c8951e` feat(chart): multi-timeframe picker (store + UI)
5. `e063fa1` feat(providers): per-(id, tf) REST cache
6. `2caf96c` feat(chart): Donchian Channels overlay
7. `ac770f2` feat(detail): backtest markers on the live chart
8. `dddd3e0` feat(backtest): persist last-tuned config
9. `090dda3` feat(detail): timeframe keyboard shortcuts
10. `745aaac` feat(backtest): "view on chart" button
11. `4075886` feat(backtest): CSV export of trades

Plus matching `docs: NOTES — …` commit after each feature so the
session log mirrors what shipped.

### Final stats

- **Tests**: 905/905 across 93 files (+101 from the day-start 804).
- **Type-check + build**: clean at every commit.
- **Branch**: `ai-schemas-and-audit`, fully up to date with origin.

### What's still open (carried into the next session)

- **Kline WS subscription per TF** — the multi-TF picker reads sub-1h
  TFs via the 60s REST TTL. Bar-close updates would need WS teardown
  + re-subscribe on every TF click. Probably not worth the complexity
  — the 60s read is good enough for the 1m / 5m / 15m / 4h cases the
  picker exposes.
- **Backtest markers across instruments selector** — Detail currently
  surfaces only the active instrument's run. A "show all my recent
  backtests" toggle would crowd the chart fast. Punt.
- **Donchian width / N-bar breakout signals** in the Signals slice —
  Donchian is now visualisable; turning it into a signal source would
  be the next-rung use of the rolling channel data.

User can resume by picking from any of the above or by running
`/loop` again with a fresh directive.

---

## 2026-04-25 (cont. 7) — CSV export of backtest trades

Pure additive QoL — once you've validated a strategy in Backtest, you
can drop the trades into a spreadsheet for manual analysis without a
manual copy-paste loop.

### Shipped — `4075886` tradesToCSV + button in TradeTable header

- `src/export/csv.ts`: `tradesToCSV(result)` — one row per trade with
  every `BacktestTrade` column + the parent config's `instrumentId`
  so multiple backtests can be joined downstream. Header-only file on
  empty trades (still a valid spreadsheet).
- `Backtest.tsx`: CSV button next to the "Trades (N)" title. Hidden
  when `trades.length === 0` (matches the "view on chart" pattern).
  Filename `nexus-backtest-{instrumentId}-{iso-ts}.csv` — multiple
  exports for the same instrument don't clobber each other.

### Status

- Tests: **905/905** across 93 files (+8 — 6 tradesToCSV, 2 button).
- Type-check + build clean.
- Branch: `ai-schemas-and-audit`.

Commits this session (newest first):
- `4075886` feat(backtest): CSV export of trades
- `745aaac` feat(backtest): "view on chart" button
- `090dda3` feat(detail): timeframe keyboard shortcuts
- `dddd3e0` feat(backtest): persist last-tuned config
- `ac770f2` feat(detail): surface backtest trade markers on the live chart
- `2caf96c` feat(chart): Donchian Channels overlay
- `e063fa1` feat(providers): per-(id, tf) REST cache
- `0c8951e` feat(chart): multi-timeframe picker
- `4a1b878` feat(ws): heartbeat watchdog
- `1b14e81` feat(chart): live-tick pulse indicator
- `4ec153e` fix(chart): snap to real-time after setData

---

## 2026-04-25 (cont. 6) — "View on chart" closes the Backtest→Detail loop

Companion to the BT-markers-on-Detail shipping in `ac770f2`. The
markers were wired but the navigation was manual: leave Backtest, find
the instrument, click into Detail, hunt for the BT pill, click it.
This commit collapses that to a single click.

### Shipped — `745aaac` ResultsPanel "view on chart →" button

- New button in the ResultsPanel header, only rendered when a result
  exists (mirrors the BT pill pattern).
- Click handler:
  1. Pre-flips `nexus_detail_bt_overlay` → `'1'` in localStorage
     BEFORE navigation. Avoids the race where Detail mounts and reads
     the stale value before Backtest can write.
  2. `selectInstrument(config.instrumentId)` — single zustand call
     that both sets `screen='detail'` and the selected instrument.

Result: click the button → Detail mounts on the right instrument
with the BT toggle already on and trades drawn.

### Status

- Tests: **897/897** across 93 files (+3 — button-absent-before-run,
  navigates-on-click, pre-flips-storage).
- Type-check + build clean.
- Backtest chunk: 21.32 KB (+0.7 KB for the button + handler).
- Branch: `ai-schemas-and-audit`.

Commits this session (newest first):
- `745aaac` feat(backtest): "view on chart" button
- `090dda3` feat(detail): keyboard shortcuts for timeframe switching
- `dddd3e0` feat(backtest): persist last-tuned config to localStorage
- `ac770f2` feat(detail): surface backtest trade markers on the live chart
- `2caf96c` feat(chart): Donchian Channels overlay
- `e063fa1` feat(providers): per-(id, tf) REST cache
- `0c8951e` feat(chart): multi-timeframe picker
- `4a1b878` feat(ws): heartbeat watchdog
- `1b14e81` feat(chart): live-tick pulse indicator
- `4ec153e` fix(chart): snap to real-time after setData

---

## 2026-04-25 (cont. 5) — Timeframe keyboard shortcuts on Detail

Power-user QoL after the picker UI shipped. Keypresses now drive the
TF picker without reaching for the toolbar pills. Mirrors the 'r'
run-chain shortcut pattern — same gating predicate (no modifiers,
not in a typing field), same DOM-light unit-testable shape.

### Shipped — `090dda3` Hotkeys + discoverable hint

Mapping (single keypress, no modifiers, not in a typing target):

```
1 → 1m    5 → 5m    q → 15m   (no two-digit keys)
h → 1h    4 → 4h    d → 1d
```

- `src/ui/keybinds.ts`: `timeframeShortcutFor(e)` returns the matching
  `Timeframe` or `null`. Reuses the existing `isTypingTarget` gate so
  one less private helper to maintain.
- `src/ui/screens/Detail.tsx`: window-level keydown listener calls
  `setTimeframe(...)` + `preventDefault()` on match. Cleanup on
  unmount tested explicitly so a remount doesn't double-fire.
- Pill `title`s now show the hotkey ("Show 5m candles  (press 5)")
  so the keybinds are discoverable without external docs.

### Status

- Tests: **894/894** across 93 files (+13 from 881 — 7 keybind
  predicate, 6 Detail integration).
- Type-check + build clean.
- Detail chunk unchanged (~13.66 KB).
- Branch: `ai-schemas-and-audit`.

### Open follow-ups

- **Kline WS subscription per TF** — picker still relies on the 60s
  REST TTL for sub-1h TFs. Bar-close updates would need a WS teardown
  + re-subscribe on every TF click. Probably not worth the complexity.

Commits this session (newest first):
- `090dda3` feat(detail): keyboard shortcuts for timeframe switching
- `dddd3e0` feat(backtest): persist last-tuned config to localStorage
- `ac770f2` feat(detail): surface backtest trade markers on the live chart
- `2caf96c` feat(chart): Donchian Channels overlay
- `e063fa1` feat(providers): per-(id, tf) REST cache
- `0c8951e` feat(chart): multi-timeframe picker
- `4a1b878` feat(ws): heartbeat watchdog
- `1b14e81` feat(chart): live-tick pulse indicator
- `4ec153e` fix(chart): snap to real-time after setData

---

## 2026-04-25 (cont. 4) — Persist last-tuned backtest config

Small follow-up from the backtest-markers session. Same memory pattern
as `screen-memory.ts` and `timeframe-memory.ts` so a theme/density
reload doesn't snap the strategy back to defaults.

### Shipped — `dddd3e0` Backtest config localStorage persistence

- `src/backtest/config-memory.ts` (NEW) — `loadBacktestConfig`,
  `saveBacktestConfig`, `clearBacktestConfig`, `initialBacktestConfig`.
  Storage key `nexus.backtest-config.v1`. Strict `isBacktestConfig`
  validator on load: required-field presence + numeric finiteness +
  string-array `entrySignals`. Silent null fallback so a corrupted
  entry never feeds `undefined` into the engine.
- `Backtest.tsx`:
  - `useState(initialBacktestConfig)` — restores at mount, defaults
    cleanly when nothing is persisted.
  - `useEffect(() => saveBacktestConfig(config), [config])` — single
    write per state change, no per-frame churn.
  - Reset now also calls `clearBacktestConfig()` so a reload after
    Reset lands on DEFAULT_CONFIG rather than restoring the cleared
    shape.

### Drive-by fix

The earlier `ac770f2` commit used hand-written test fixtures for
`BacktestConfig` + `BacktestTrade` with field names from an older
schema (`riskPerTrade`, `exitRules`, `slippage`, lowercase enum
values). Tests still passed at runtime because the store action and
Detail read path don't validate the shape, but the fixtures were
misleading and would have rotted. Replaced with
`{ ...DEFAULT_CONFIG, instrumentId }` + proper enum casing.

### Status

- Tests: **881/881** across 93 files (+14 from 867 — 13 config-memory,
  1 Backtest wiring).
- Type-check + build clean.
- Backtest chunk: 20.65 KB (+0.7 KB).
- Branch: `ai-schemas-and-audit`.

### Open follow-ups

- **Kline WS subscription per TF** — picker still relies on the 60s
  REST TTL for sub-1h TFs. Bar-close updates would need a WS teardown
  + re-subscribe on every TF click. Probably not worth the complexity.
- **Backtest markers across instruments** — currently only the active
  instrument's run shows on Detail. Could let the user pick "show ALL
  recent backtests" but that crowds the chart fast. Punt.

Commits this session (newest first):
- `dddd3e0` feat(backtest): persist last-tuned config to localStorage
- `ac770f2` feat(detail): surface backtest trade markers on the live chart
- `2caf96c` feat(chart): Donchian Channels overlay
- `e063fa1` feat(providers): per-(id, tf) REST cache
- `0c8951e` feat(chart): multi-timeframe picker
- `4a1b878` feat(ws): heartbeat watchdog
- `1b14e81` feat(chart): live-tick pulse indicator
- `4ec153e` fix(chart): snap to real-time after setData

---

## 2026-04-25 (cont. 3) — Backtest markers on Detail chart

Closes the second open follow-up from the Donchian session. Lifts
backtest results out of `Backtest.tsx` local component state into the
market store so the Detail screen can overlay trade entry/exit
markers on the live candle chart for the same instrument.

### Shipped — `ac770f2` Backtest results store slice + Detail BT toggle

- `MarketStore.backtestResults: Record<string, BacktestResult>` keyed
  by instrumentId. In-memory only — backtest results are MB-scale and
  cheap to re-run, no point burning localStorage quota.
- `setBacktestResult(result)` — adds/replaces by `result.config.instrumentId`.
- `clearBacktestResult(id?)` — drops one, or wipes the entire map
  when called with no arg.
- `Backtest.tsx` pushes the result into the store after every run.
  Reset clears only the active instrument so prior runs on OTHER
  instruments stay accessible from Detail.
- `Detail.tsx` exposes a third toolbar pill `BT N` (where N is the
  trade count) next to BB/DC. Pill is HIDDEN entirely when no result
  exists for the current instrument. When on, passes
  `tradeMarkers={result.trades}` to `TradingViewChart` — the marker
  plugin from the trade-chart shipping in `38aab95` already handles
  the green-up / red-down arrows + PnL-coloured exit squares.

### Status

- Tests: **867/867** across 92 files (+13 from 854 — 7 store, 5 Detail
  toggle, 1 Backtest→store wiring with engine mock).
- Type-check + build clean.
- Detail chunk: 13.66 KB (+0.7 KB).
- Backtest chunk: 19.92 KB (+0.1 KB).
- Branch: `ai-schemas-and-audit`.

### Open follow-ups

- **Kline WS subscription per TF** — picker still relies on the 60s
  REST TTL for sub-1h TFs. Bar-close updates would need a WS teardown
  + re-subscribe on every TF click. Probably not worth the complexity.
- **Persist last-run backtest config** to localStorage so reload
  restores the strategy the user was tuning. Small lift, low priority.
- **Backtest markers across instruments selector** — currently only
  the active instrument's run shows. Could let the user pick "show
  ALL my recent backtests" but that crowds the chart fast. Punt.

Commits this session (newest first):
- `ac770f2` feat(detail): surface backtest trade markers on the live chart
- `2caf96c` feat(chart): Donchian Channels overlay
- `e063fa1` feat(providers): per-(id, tf) REST cache
- `0c8951e` feat(chart): multi-timeframe picker
- `4a1b878` feat(ws): heartbeat watchdog
- `1b14e81` feat(chart): live-tick pulse indicator
- `4ec153e` fix(chart): snap to real-time after setData

---

## 2026-04-25 (cont. 2) — Donchian Channels overlay

Carry-forward closed: Donchian Channels was the only "same shape as
Bollinger" item left on the chart-overlays list. Implementation is a
true mirror of `56b9519` (BB shipping commit), so the codepaths look
nearly identical end-to-end and the two toggles can be enabled
independently or together without bleeding into each other.

### Shipped — `2caf96c` Donchian Channels (DC) overlay

- `calcDonchianSeries(candles, period=20)` in `analytics/indicators.ts`.
  Returns `Array<{upper, middle, lower} | null>` — null for positions
  before the seed window so the lines start cleanly at bar `period-1`.
  Naive O(n × period) (≤200 × 20 here, no need for monotonic deque).
  Edge cases: non-positive period → all-null, flat highs == lows →
  three lines collapsed to a single point.
- `TradingViewChart` accepts `donchian?: { period } | null` (default
  `null` — off by default). When non-null, three LineSeries (cyan,
  dashed envelope + solid mid) join BB on the candle price scale.
  Same `dcKey` mount-effect dep + Whitespace gap pattern as BB.
- `Detail.tsx` exposes a `DC` pill in the chart toolbar next to `BB`.
  Storage key `nexus_detail_dc_overlay` (independent slot from BB).
  Refactored the BB load/save helpers into shared
  `loadOverlayToggle(key) / saveOverlayToggle(key, v)` so adding the
  next overlay (VWAP, pattern shading) is a one-line `useState`.

### Status

- Tests: **854/854** across 91 files (+13 from 841 — 8 series, 5 toggle).
- Type-check + build clean.
- Detail chunk: 12.96 KB (+0.4 KB).
- TradingViewChart chunk: 181.00 KB (+0.9 KB).
- Branch: `ai-schemas-and-audit`.

### Open follow-ups

- **Surface backtest markers on Detail** — needs backtest results in
  the store first.
- **Kline WS subscription per TF** — picker currently relies on the
  60s REST TTL for sub-1h TFs. Bar-close updates would require
  tearing down + re-establishing the WS on every TF click. Probably
  not worth the complexity vs. the 60s read.

Commits this session (newest first):
- `2caf96c` feat(chart): Donchian Channels overlay
- `e063fa1` feat(providers): per-(id, tf) REST cache
- `0c8951e` feat(chart): multi-timeframe picker
- `4a1b878` feat(ws): heartbeat watchdog
- `1b14e81` feat(chart): live-tick pulse indicator
- `4ec153e` fix(chart): snap to real-time after setData

---

## 2026-04-25 (cont.) — Multi-timeframe candle picker

Carried forward from the same-day real-time fixes. The earlier session
identified the hard-coded `'1h'` in `refreshAll` as the single biggest
reason the chart "feels slow even when everything is wired correctly"
— the data IS flowing, but at 1h granularity bars only close every
3600s so to the eye nothing moves. Picking 1m or 5m unlocks visible
candle motion within seconds.

### Shipped — `0c8951e` Picker UI + store field + persistence

- `src/ui/timeframe-memory.ts` (NEW) — mirror of `screen-memory.ts`
  with `nexus.timeframe.v1` storage key. `VALID_TIMEFRAMES =
  ['1m','5m','15m','1h','4h','1d']`. Silent fallback to `'1h'` on
  malformed JSON / unknown enum / wrong type.
- `MarketStore.selectedTimeframe: Timeframe` + `setTimeframe(tf)` action.
  - Restored from storage at module load.
  - Action is a no-op when picker = active TF (no extra refresh, no
    extra storage write on idle clicks).
  - On real change: persist + `void get().refreshAll()` so the chart
    updates within the same paint instead of waiting for the next 5s
    store tick.
- `refreshAll` now reads `selectedTimeframe` instead of `'1h'`.
- 6-pill picker in the Detail chart toolbar, visual order: TF picker
  → BB toggle. `data-testid="detail-tf-{tf}"` per pill +
  `detail-tf-picker` for the group.
- Mock generator gets a `'15m'` entry in `TF_MS` / `TF_VOL`.

### Shipped — `e063fa1` Provider per-(id, tf) REST cache

The picker is useless if `getCandles` keeps returning the WS-fed 1h
cache regardless of the requested TF. This commit adds the read-path
plumbing across all four real providers.

Pattern (identical in binance/spot, binance/futures, coinbase, kraken):
- `tf === '1h'` → return existing WS-fed cache (zero REST hit, fully
  live).
- Otherwise → check `candlesByTf[id|tf]`. If fresh (< 60s), return.
  Else fetch via REST, normalize, store.
- REST failure with stale entry → serve stale (real-but-old beats
  falling through to mock-but-fresh).
- REST failure with no entry → throw, let `store/refreshAll` chain
  try the next provider.

TTL is 60s for all providers — Kraken's 1 req/sec soft limit is the
strictest, so 1 fetch/min per (id, tf) keeps everyone within budget
even when the store ticks every 5s.

TF coverage:
- **Binance** (spot + futures): `1m / 5m / 15m / 1h / 4h / 1d` — all
  native, same string interval.
- **Coinbase**: `1m / 5m / 15m / 1h / 1d` (no 4h — let chain fallback
  to Binance/Kraken).
- **Kraken**: `1m / 5m / 15m / 1h / 4h / 1d` — minute-based interval
  translation (`1, 5, 15, 60, 240, 1440`).
- **Mock**: every TF including 15m via the extended `TF_MS` / `TF_VOL`
  maps.

### Status

- Tests: **841/841** across 91 files (+28 from 813 — 8 timeframe-memory,
  6 store, 7 Detail picker, 7 binance-spot multi-TF).
- Type-check + build clean.
- Detail chunk: 12.56 KB (+1 KB for the picker).
- TradingViewChart chunk unchanged at 180.11 KB.
- Branch: `ai-schemas-and-audit`.

### Open follow-ups

Same list, minus the now-closed multi-TF item:
- **Donchian channels** — same shape as Bollinger.
- **Surface backtest markers on Detail** — needs backtest results in
  the store first.
- **Kline WS subscription per TF** — current implementation only WS-
  subscribes to 1h. For sub-1h TFs the chart updates on the 60s REST
  TTL, not bar-close. Could wire a "follow the active TF" subscription
  but it would require tearing down + re-establishing the WS on every
  picker click. Probably not worth the complexity vs. the 60s TTL
  read.

Commits this session (newest first):
- `e063fa1` feat(providers): per-(id, tf) REST cache
- `0c8951e` feat(chart): multi-timeframe picker
- `4a1b878` feat(ws): heartbeat watchdog
- `1b14e81` feat(chart): live-tick pulse indicator
- `4ec153e` fix(chart): snap to real-time after setData

---

## 2026-04-25 — Real-time pipeline fixes (scroll snap + tick pulse + WS watchdog)

User: "pourquoi les courbes de marchés ne s'actualisent pas d'ailleurs?"
Diagnosis revealed three combined causes, all addressed in this session.

### Root causes identified

1. **lightweight-charts preserves scroll position across `setData`.** The
   store refresh ran every 5s, candle data flowed in correctly, but new
   bars landed off-screen to the right unless the user happened to be
   pinned at the latest bar. Felt like the chart was frozen.
2. **No way to see whether data was actually flowing into the chart.**
   The StatusBar shows a global "REFRESHED Xs AGO" but it sits at the
   bottom of the viewport — far from the eye when staring at a chart.
3. **Browser WebSockets can stay OPEN long after the connection died.**
   Zombie sockets behind NAT / corporate proxies / load balancers that
   drop idle TCP without sending FIN. The existing onclose-driven
   reconnect handles loud disconnects but silent staleness was invisible.
   The chart pipeline kept reading the same cached candles forever.

### Shipped — `4ec153e` Auto-snap scrollToRealTime when user is at the latest bar

Inside the data-push effect of `<TradingViewChart />`:

- Capture `timeScale().scrollPosition()` BEFORE pushing data.
- After `setData` for all series, if `pos >= -1` (1-bar tolerance for
  jitter), call `chart.timeScale().scrollToRealTime()`.
- Manual back-scroll is preserved — only the auto-tracking case snaps.

3-line behavioral fix wrapped in 27 lines of commentary.

### Shipped — `1b14e81` Live-tick pulse indicator on every chart

Small badge in the top-right corner of every TradingViewChart:

- Dot turns green / yellow / red as the last successful `setData`
  ages (< 10s / < 60s / beyond).
- Label cycles "live" → "Xs" → "Xm" → "Xh" → "waiting…" (initial).
- CSS keyframe pulse runs only while the tick is fresh (< 10s).
- 1 Hz `setInterval` keeps the delta honest between data ticks
  without re-rendering the chart engine.
- `lastTickAt` stamped only when `sorted.length > 0` so an empty
  push doesn't claim a successful tick.

3 new tests: presence on mount, meaningful label after first push,
fallback to "waiting…" with no candles.

### Shipped — `4a1b878` WS heartbeat watchdog (Binance + Coinbase)

Both WebSocket managers now track message arrival time and force a
reconnect when silence exceeds the threshold:

- `lastMsgAt` stamped on `onopen` AND on every `onmessage`.
- A `setInterval` samples at `silenceTimeoutMs/3` (capped 1s..10s).
- When silence > `silenceTimeoutMs` (default **30s**) AND the socket
  still reports OPEN, the watchdog calls `ws.close()`.
- The existing `onclose` handler then schedules reconnect via the
  existing exponential-backoff path — no new reconnect logic needed.
- `disconnect()` and `onclose` both clear the watchdog interval.

Public API additions:
- `WsManager.lastMessageAt(): number`
- `CoinbaseWsManager.lastMessageAt(): number`

Pass `silenceTimeoutMs: 0` to disable (used in tests).

Defaults rationale: Binance combined ticker streams emit every 1-2s
under normal load; Coinbase fires on every trade (busier). 30s is
unambiguous staleness for both.

6 new tests with `vi.useFakeTimers()` + mock WebSocket exercising:
initial `lastMessageAt()=0`, update on each message, force-reconnect
after silence, no reconnect while messages flow, `silenceTimeoutMs=0`
disables watchdog, `disconnect()` cleanly stops it.

### Status

- Tests: **813/813** across 88 files (+9 from 804 — 3 chart, 6 WS).
- Type-check + build clean.
- Backtest chunk: 19.83 KB (unchanged).
- TradingViewChart chunk: 180.11 KB (+1.4 KB for the tick indicator).
- Branch: `ai-schemas-and-audit`, fully up to date with origin.

### Open follow-ups

Carried forward from the earlier overlays session:
- **Multi-timeframe candle store** — would unlock a 1m/5m/15m/1h
  picker. The current `'1h'` hard-code in `refreshAll` is the
  single biggest reason the chart "feels" slow even when everything
  is wired correctly. Bigger lift; deferred.
- **Donchian channels** — same shape as Bollinger.
- **Surface backtest markers on Detail** — needs backtest results
  in the store first.

Commits this session (oldest → newest):
- `4ec153e` fix(chart): snap to real-time after setData
- `1b14e81` feat(chart): live-tick pulse indicator
- `4a1b878` feat(ws): heartbeat watchdog detects silent disconnects

---

## 2026-04-24 (post-deadline) — Bollinger Bands overlay + Backtest trade chart

Loop deadline had already fired at 19h. User picked up the thread with
"donc on fait quoi maintenant?" then "je te laisse faire ton plan et le
suivre". I took two items off the open-follow-ups list from the earlier
entry in this same file: Bollinger Bands on TradingViewChart, and
entry/exit markers on the backtest candle view. Both shipped.

### Shipped — Bollinger Bands overlay on TradingViewChart

- `calcBollingerSeries(closes, period=20, mult=2)` in
  `analytics/indicators.ts`. O(n) sliding window using `sum` + `sumSq`
  and `Var = E[X²] − E[X]²`, clamped against float drift. Returns
  `Array<{upper, middle, lower, bandwidth} | null>` — null for the
  first `period-1` positions so the lines start cleanly at seed.
- `TradingViewChart` accepts `bollinger?: {period, stdDev} | null`
  (default `null` — off by default). When non-null, three LineSeries
  are added sharing the candle price scale: upper (dashed yellow),
  middle (dotted grey, SMA anchor), lower (dashed yellow). All three
  remount on `bbKey = "${period}:${stdDev}"` so param changes land
  cleanly without tearing down the chart.
- Whitespace data fills positions before the first full window so the
  lines don't pin to 0.
- 4 new chart tests: `bollinger=null` default, config provided, window
  shorter than period, non-positive period rejected. 8 new indicator
  tests (length, nulls before seed, values against spot-check,
  symmetric bands on flat input, zero-mean bandwidth guard, etc.).

### Shipped — BB toggle on Detail

Shown as a chart-toolbar button top-right of the Detail candle view.
Starts unpressed; click flips `aria-pressed`; preference persists to
`localStorage['nexus_detail_bb_overlay']` so remounts keep it on. The
toggle is only rendered when the chart branch renders (so we don't
expose a control that does nothing when candles are scarce).

5 new tests on Detail cover: presence, default unpressed, click flips
state, localStorage round-trip across unmount, hidden when the chart
branch bails.

### Shipped — Trade markers on TradingViewChart + Backtest trade chart

Same `createSeriesMarkers` plugin as the signal markers from earlier
today — added a second source so signals + trades can coexist without
tearing each other down.

- New `tradeMarkers?: BacktestTrade[]` prop. Long entry = green
  arrow-up below the bar; short entry = red arrow-down above the bar.
  Exits are coloured squares (green if PnL ≥ 0, red otherwise) with
  the net-$ amount in the label. Invalid timestamps filtered silently.
- `<TradeChartCard />` on the Backtest screen reads candles from the
  store and clamps the window to `[firstEntry-10, lastExit+5]` so the
  arrows dominate instead of drowning in pre-signal flat territory.
  EMAs default off on this card for the same reason. Falls back to an
  empty-state string when no candles are loaded for the instrument.
- Slotted between `<EquityChartCard />` and `<TradeTable />` in the
  Backtest results column.
- 5 new chart tests: empty default, long trade, losing short trade,
  signal + trade merge in the same render, invalid timestamps.

### Status

804/804 tests across 87 files (+22 from the earlier 782/782 — 8
Bollinger indicator, 4 BB chart, 5 Detail toggle, 5 trade markers).
Type-check + build clean. Backtest chunk stays at 19.83 KB raw
(+none), lightweight-charts chunk at 178.75 KB raw (+~6 KB for the
Bollinger LineSeries + marker plumbing). Worth it.

Open follow-ups carried forward:
- Chart-toolbar / interval picker (still needs a multi-timeframe
  store — park until that lands).
- Donchian channels (mechanically the same shape as Bollinger but
  max/min over window instead of mean ± σ).
- Surface backtest markers on Detail when a result exists in state —
  would need to move backtest results into the store first. Deferred.

Commits this sub-session (oldest → newest):
- `56b9519` feat(chart): Bollinger Bands overlay with per-user toggle
- `38aab95` feat(backtest): trade chart with entry/exit markers

---

## 2026-04-24 — Redesign phase: Dashboard split-view, EMA overlays, full Recharts removal

Branch `ai-schemas-and-audit`. Autonomous /loop session continuing the
v3 design handoff merge with `lightweight-charts`. The four NOTES items
the user originally listed (btnSecondary extract, audit-filter persist,
'r' keybind, drilldown polish) all already shipped on 2026-04-18, so
this session realigned to the open redesign roadmap: Dashboard split-
view, chart overlays, and finishing the Recharts → lightweight-charts
migration kicked off on Detail.

### Shipped — Dashboard split-view + draggable handle

- New `<DragHandle />` component (full keyboard support, ARIA
  separator role, window-scoped move/up listeners that release on
  mouseup). Persists the user's chosen height to
  `localStorage['nexus_focus_bottom_h']`.
- Dashboard reworks the watchlist into two stacked panes: top = the
  existing watchlist table; bottom = a focus pane showing OHLCV chart
  + signals for the row a user single-clicks. Double-click still
  navigates to Detail; an "Open Full Detail" button mirrors the
  same intent for keyboard users.
- Empty-state placeholder when nothing is focused yet ("Click a row
  to preview, double-click for full detail").
- Tests: 14 new for `<DragHandle />` (ARIA, keyboard nudge with 8/16
  steps + clamping, mouse drag down-shrinks/up-grows + clamp + body-
  cursor restore on mouseup); 9 new for Dashboard split-view (focus
  pane render, click vs dblclick semantics, separator presence,
  empty-state placeholder, localStorage init + write).

### Shipped — EMA 20/50 overlays on TradingViewChart

- Added `calcEMASeries(data, period)` to `analytics/indicators.ts` —
  rolling EMA that returns one value per input position (nulls for
  the seed window). Final value matches `calcEMA` on the same data;
  flat input converges; non-positive periods rejected.
- `TradingViewChart` now accepts `emaPeriods?: number[]` (default
  `[20, 50]`, pass `[]` to disable). Each period gets a colour-coded
  LineSeries (orange/cyan/purple/accent at 20/50/100/200) sharing
  the candle price scale. Whitespace data fills positions before
  the seed so the line starts exactly at bar `period - 1` instead of
  pinning to 0.
- Bottom-left legend with colour dots + "EMA {period}" labels;
  hidden entirely when `emaPeriods` is empty.
- Also added `height="auto"` mode for the chart wrapper — fills a
  sized parent (used by Dashboard's focus pane). Back-compat: the
  default 240 px stays the default for existing call sites.
- 7 new indicator tests (length, null prefix, seed = SMA, final =
  calcEMA, flat convergence, period === length, non-positive
  rejection). 5 new chart tests (auto-height, legend default, custom
  periods, hidden when empty, tolerates short window).

### Shipped — MiniChart: Recharts → inline SVG

Sparklines don't need an axis engine; lightweight-charts would create
a WebGL context per row (catastrophic for 20+ watchlist rows). So
MiniChart got a hand-rolled inline SVG path instead.

- Pure exported `buildSparklinePath(values, w, h, inset)` — returns
  `"M x0 y0 L x1 y1 …"`. Min → bottom, max → top, even x-spacing,
  flat input draws a horizontal mid-line (no divide-by-zero).
- Component contract preserved 1:1: <2 valid samples → em-dash
  empty state; NaN/Inf filtered; auto green-up / red-down; `color`
  prop wins; default 80×30; `strokeWidth` prop honoured.
- Both `useMemo` calls (clean filter + path) sit before the early
  return so hooks fire unconditionally on every render.
- Tests rewritten — 19 cases now: 4 empty-state, 3 wrapper geometry,
  6 SVG output (stroke colours, aria, custom strokeWidth), 6 pure
  geometry on `buildSparklinePath`.

### Shipped — Backtest equity curve: Recharts → lightweight-charts

Backtest was the last consumer of recharts in the app, so finishing
this migration also lets us drop the dependency entirely.

- New shared `<EquityChart points initialCapital height />` built
  on lightweight-charts. Two series: equity LineSeries on the
  default right scale (top ~70%) + drawdown AreaSeries pinned to a
  bottom price scale (~30%). Initial capital appears as a dashed
  PriceLine on the equity series, mirroring the old ReferenceLine.
- `EquityChartCard` in Backtest is now a thin card-chrome wrapper
  around `<EquityChart />` — same visual layout, much smaller bundle.
- 7 new smoke tests modelled on the TradingViewChart suite (JSDom
  bail, no-tooltip-on-mount, dedupe + sort, empty array, fixed +
  auto height, missing initial capital).
- `recharts` removed from `package.json` + `package-lock.json`.

### Bundle impact

```
                       before      after
Backtest chunk      374 KB raw    19 KB raw
                  (108 KB gzip) ( 6 KB gzip)
```

The Backtest chunk had ballooned after the MiniChart migration
because it became the sole consumer of recharts (so the 290 KB
CartesianChart code-split lost its independent home and folded
into Backtest's lazy chunk). Removing recharts collapses that.

### Shipped — Signal markers on TradingViewChart

After the recharts removal landed, added signal markers as the next
chart-level enhancement so users can see WHERE signals fired, not just
read them in a list.

- `TradingViewChart` accepts a new `markers?: SignalEvent[]` prop
  (default `[]`). Each signal becomes a `SeriesMarker<Time>` pinned
  to the bar whose timestamp it fired on:
    • bullish → green `arrowUp` below the bar
    • bearish → red `arrowDown` above the bar
    • neutral → grey `circle` in-bar
- Plugin lifecycle: `createSeriesMarkers` runs once in the mount
  effect and the handle goes into `markersPluginRef`. A separate
  effect translates the prop into the marker payload and pushes via
  `setMarkers`, so signal updates don't tear the chart down.
- Defensive guards: dedup by `(time, type)` so duplicate provider
  emissions don't double-stamp; filter out non-finite timestamps;
  sort ascending before push (lib requires it).
- Wired in: Detail screen reuses the per-instrument signal slice
  already built for the sidebar; Dashboard focus pane reuses
  `focusedSignals` (top 12 for the focused row), so markers track
  the watchlist selection live.
- 5 new tests cover empty/default, mixed bullish+bearish+neutral,
  same-bar dedup, ghost markers (timestamp not in candle window),
  and invalid-timestamp filtering.

Bundle: lightweight-charts chunk grew 164 → 172 KB raw / +3 KB gzip
to include the markers plugin code path. Worth it.

### Status

782/782 tests across 87 files (started at 770/770; +12 across the
session — 7 EquityChart + 5 markers). Type-check + build clean.
Recharts is gone from the dependency tree. lightweight-charts is now
the single chart engine across Detail, Dashboard focus pane, and
Backtest; MiniChart owns the small-scale sparkline case with zero
deps; signal markers ride on the same engine for both screens.

Loop deadline (19h local) reached just after the markers commit
landed. Stopping the autonomous loop here. Open follow-ups for the
next session:
- Bollinger / Donchian band overlays on TradingViewChart (need a
  `calcBollingerSeries(data, period, stdDev)` helper analogous to
  `calcEMASeries`, then 3 LineSeries sharing a colour family).
- Backtest entry/exit markers on the Detail chart when a backtest
  result is in-store — same plugin, different source.
- Chart-toolbar / interval picker — bigger lift, needs a multi-
  timeframe candle store; park until store layer is ready.

Commits this session (oldest → newest):
- `7823270` feat(dashboard): split-view watchlist + focus pane per v3
- `11df048` test(dashboard): cover split-view focus + DragHandle
- `6451786` feat(chart): EMA 20/50 overlays + legend
- `45eaebd` refactor(minichart): swap recharts for inline SVG
- `7e7f837` refactor(backtest): migrate equity curve, drop recharts
- `59fbaae` docs: NOTES — redesign-phase session log
- `4861f2e` feat(chart): signal markers on TradingViewChart

---

## 2026-04-20 — Kraken live provider + functional LIVE / ANALYST badges

Branch `ai-schemas-and-audit`. Two user-driven bits in one commit:
- "on essaie quand meme de connecter quelques api gratuit?" → Kraken
  (third live crypto source, no API key).
- "'Analyst mode' en haut a droite, pareil pour le live en vert, c'est
  purement gadget" → both badges now carry real state + click-through.

### Shipped — Kraken spot provider

Third crypto source next to Binance + Coinbase. REST-only (no WS),
public endpoints, no key, browser CORS OK.

- `src/providers/kraken/{types,spot}.ts` modeled on the Coinbase
  shape. `Ticker` + `OHLC` fetched in parallel at connect() and on
  every `getSnapshot`. Kraken has no push channel, so the refresh
  cycle drives the live path — rate-limit (~1 req/sec anonymous) is
  comfortable for 3 instruments polled every 5s.
- `normalization/instrument.ts`: `KRAKEN_MAPPINGS` + helpers. Pair
  legacy is handled (BTC → XBT); response key lookup uses
  `Object.values()[0]` so we don't care whether Kraken returns
  `XBTUSD` or `XXBTZUSD`.
- 24h rolling open is derived from candle `[length-24].open`, not
  Kraken's `o` (which is "today's 00:00 UTC open", not rolling).
  Matches what we did for Polygon's intraday stats.
- `store/market.ts`: `krakenConnected` flag + third step in the
  per-instrument fallback chain: binance → coinbase → kraken →
  mock. Independent connect block so a Kraken 403 doesn't break the
  other providers.
- `PROVIDER_DEFS[kraken]` added with status `active`. The Sources
  screen now lists Binance + Coinbase + Kraken all live.

### Shipped — LIVE + ANALYST MODE badges stop being decoration

Both badges in the top-right corner of `Nav.tsx` were purely
cosmetic. Now they carry state + route to the relevant screen.

- **LIVE badge**: was hard-wired to `binanceConnected`, now
  aggregates over {binance, coinbase, kraken}. Reads
  `LIVE · N/3` (green dot if all, yellow if partial, red +
  `OFFLINE` if none). Click routes to Sources. `title` tooltip
  lists each provider's state.
- **ANALYST MODE badge**: previously a static label. Now a button
  (`cursor: pointer`, keyboard-accessible `aria-label`) that routes
  to Options. `title` tooltip explains what the mode guarantees:
  "Research & monitoring only. No live trading — every order
  routes to the paper broker."
- Tests: Nav live-indicator suite rewritten for the new string
  format (`LIVE · N/3` instead of `LIVE`) and two new assertions
  cover the click-through on both badges.

692/692 tests (was 689/689). Type-check + build clean.

---

## 2026-04-20 — RTL coverage: MiniChart + DemoSplash (9/9 components)

Branch `ai-schemas-and-audit`. Quick-hit session — closed the last two
gaps in UI-component RTL coverage. Was 7/9 after the 2026-04-18
after-arc; now 9/9.

### Shipped

- `tests/ui/components/MiniChart.test.tsx` — 8 tests. The recharts
  SVG doesn't render measurable paths in JSDom (no layout), so the
  assertions focus on what we own: the em-dash empty-state branch
  (empty array, single point, all-invalid), the NaN/Infinity filter
  (mixed valid + invalid still hits the chart branch once ≥2 valid
  remain), and the outer wrapper's `width` / `height` (prop + default).
- `tests/ui/components/DemoSplash.test.tsx` — 12 tests. Chrome
  (NEXUS h1, ANALYST MODE eyebrow, 3 bots all ACTIVE, 5 shared-package
  chips, stats strip with refreshed counts, Enter CTA), dismissal
  paths (Enter button click, Escape key, Enter key, backdrop click),
  negative cases (unrelated keys ignored, clicks inside card don't
  bubble to backdrop), and the keydown-listener cleanup on unmount.

689/689 tests (was 669/669). Type-check + build clean. No source
changes — coverage-only commit.

### Parked items (untouched this session)

- **Polygon / Alpaca equity providers** — needs API keys, parked
  per user directive.
- **TradingView chart on Backtest equity curve** — medium lift, deferred.
- **Cross-source disagreement alert (binance vs coinbase)** — deferred.

---

## 2026-04-19 — Live Coinbase provider + TradingView chart on Detail

Branch `ai-schemas-and-audit`. Two real features (not polish), both
asked for verbatim by the user:
- "il faut connecter les autres api aussi, coinbase etc"
- "pour l'affichage sur 24h, je veux le meme que tradingview, parce
  que c'est difficile d'etre precis avec celui actuel"

### Shipped — Coinbase live spot (`9cb09cf`)

A second live crypto provider next to Binance, no API key required
(public market-data endpoints, browser CORS OK).

- New `src/providers/coinbase/{types,ws,spot}.ts` modeled on the
  Binance pattern. REST init (ticker + 24h stats + candles), then
  WS ticker channel for live price/bid/ask updates. Coinbase candles
  arrive in DESCENDING time order — reversed before storage.
- `coinbase/ws.ts` is a Coinbase-specific WS manager (Coinbase
  subscribes via JSON message after open, not URL path like Binance).
- `normalization/instrument.ts` gains `COINBASE_MAPPINGS` + helpers
  for the same 3 spot pairs (BTC/ETH/SOL-USD).
- `normalization/snapshot.ts` gains `normalizeCoinbaseTicker` —
  derives `change24h` from `open24h` since Coinbase doesn't return
  the change directly.
- `store/market.ts`: `coinbaseConnected` flag + per-instrument
  fallback chain in `refreshAll` — `binance → coinbase → mock`. An
  outage on one exchange keeps the dashboard live via the other.
- 12 new unit tests (mapping + normalizer).
- `PROVIDER_DEFS[coinbase].status` flipped from `disconnected` to
  `active`. Sources screen now shows Coinbase as live.

### Shipped — TradingView 24h chart (`ef06463`)

Recharts `ComposedChart` on Detail replaced with TradingView's
open-source `lightweight-charts` engine — the user-facing thing the
user explicitly asked for.

- New `<TradingViewChart />` component: candlestick body + volume
  histogram on a separate price-scale pane (78/22 split via
  `scaleMargins`). Full crosshair + a top-left status row that
  mirrors TradingView's own (date · O/H/L/C · % vs prior close ·
  volume), themed to the slate-50 accent palette.
- Defensive: dedupes + sorts candles by timestamp before `setData`.
  The lib hard-asserts strict-ascending timestamps, and real-world
  WS streams can briefly emit duplicates (last partial candle
  replayed alongside a fresh REST seed).
- Detail.tsx: drops every recharts import for the chart block,
  passes the raw 60-candle window straight through.
- `tests/setup.ts`: matchMedia + ResizeObserver polyfills for
  JSDom. Without them, lightweight-charts → fancy-canvas crashes at
  import time and every test that touches the chart import chain
  blows up.
- 5 new smoke tests for the chart component (renders container,
  no tooltip until interaction, dedup path, height prop).

Bundle: Detail lazy chunk grows 25 → 170 KB raw (8 → 54 KB gzip).
Acceptable: Detail is lazy-loaded so first-paint is unaffected, and
the visual + interaction quality jump is exactly what was asked for.
Backtest + MiniChart still use Recharts (different needs).

669/669 tests + tsc + build green.

### Open follow-ups

- Connect equity providers (Polygon / Alpaca) — needs API keys.
- Apply TradingView chart to Backtest equity curve too if user
  wants visual consistency.
- The fallback chain is binance → coinbase → mock, which means
  Binance always wins when both are live. A future "preferred
  source" toggle (or a cross-source disagreement alert) could be
  useful — Coinbase prices already arrive, just not displayed.

---

## 2026-04-19 — UX polish, follow-up #6: more white-on-white button fixes

Branch `ai-schemas-and-audit`. The DemoSplash audit (follow-up #5)
prompted a grep for any remaining `color: '#fff'` on `colors.accent`
pairings — the accent went cyan → slate-50 in the v1→v2 palette
migration, so every literal `#fff` text on the accent background is
now invisible.

### Shipped

- `src/ui/screens/Backtest.tsx` — "Run Backtest" button.
- `src/ui/screens/ChainMonitor.tsx` — "Run decision chain" button.

Both switched from `color: '#fff'` to `color: colors.bg` so the label
reads dark-on-light against the slate-50 accent.

CSS only. 652/652 tests + tsc + build green. Grep is now clean for
that pattern across `src/`.

---

## 2026-04-19 — UX polish, follow-up #5: DemoSplash refresh

Branch `ai-schemas-and-audit`. Audit of `src/ui/components/DemoSplash.tsx`
turned up four issues left over from the v1 → v2 palette migration and
stale stats:

### Shipped

- **Invisible Enter button** — `color: '#fff'` on `background: colors.accent`
  used to be white-on-cyan; v2 accent is now slate-50 (`#f1f5f9`), so the
  text was effectively white-on-white. Switched to `color: colors.bg` so
  the label reads dark-on-light against the new accent.
- **ANALYST MODE label** — was `color: colors.cyan`; aligned to
  `colors.accent` so the splash matches the rest of the chrome.
- **Stale stats** — Screens `13` → `16` (real count after the Phase-3
  retrofits) and Tests `186+` → `652+` (matches today's suite count).
- **Stale Analyst feature copy** — "13 interactive screens" → "16".

CSS / copy only. 652/652 tests + tsc + build green.

---

## 2026-04-19 — UX polish, follow-up #4: focus ring + selection + scrollbar

Branch `ai-schemas-and-audit`. Three small global-CSS additions in
`src/index.css`. Found by noticing that several components set
`outline: none` on inputs/buttons (theme.ts inputStyle, WorkspaceManager
inputs) without ever providing a keyboard-focus replacement — meaning
Tab-navigation gave no visual feedback at all.

### Shipped — `2bc87b8`

- `:focus-visible` — slate-300 (`#94a3b8`) 2px ring at 1px offset.
  Triggers only on keyboard focus (Tab), never on mouse click. Works
  globally so we don't have to retrofit every input/button. Keyboard
  navigation is now usable across the entire app.
- `::selection` — slate-300 at 30% alpha. Replaces browser-default
  blue, so selecting price/symbol text stays on the greyscale brand.
- Scrollbar — track now matches the new `bg: #0d1117`, thumb matches
  `borderStrong: #3d4555`, plus a hover state (`#4d5565`) so the
  thumb lights up on interaction.

CSS-only. 652/652 tests + tsc + build green.

---

## 2026-04-19 — UX polish, follow-up #3: density-driven table fonts

Branch `ai-schemas-and-audit`. Closes the latent finding flagged in
the Options-translation NOTES entry: `density.fontBody`/`fontHeader`
existed in tokens.ts but had no consumer.

### Shipped — `be425b5`

- `theme.ts`: `thStyle.fontSize` now reads `activeDensity.fontHeader`
  (11 → 12 at default comfy = +1px visible win on every table header
  in the app). `tdStyle.fontSize` now reads `activeDensity.fontBody`
  (still 13 at comfy = no visible change at default, but density
  toggle is no longer a placebo for table fonts: compact → 11,
  spacious → 14).
- Comment block in `theme.ts` rewritten to say fonts now follow
  density and to spell out what intentionally stays fixed
  (`statValue`, `sectionHeader`, `inputStyle` — informational chrome,
  not body content; bumping them with density would over-shift
  semantic meaning).
- 2 new density tests (`thStyle.fontSize ↔ fontHeader`,
  `tdStyle.fontSize ↔ fontBody`) pin the wiring so a future drift
  trips a test.

Net effect on the user's "text is too small" feedback: the prior
Inter swap moved the needle the most, but now density toggle in
Options → Appearance also has a real font impact. Spacious + Inter
should feel meaningfully larger than the previous default.

652/652 tests + tsc + build green.

---

## 2026-04-19 — UX polish, follow-up #2: Options screen English

Branch `ai-schemas-and-audit`. Last big FR pocket in the user-facing
chrome — Options was almost entirely French (8 section titles + hints,
4 segmented option labels, all Placeholder copy, the ScreenHeader
subtitle, the hotkey descriptions). All translated.

### Shipped — `d9deef9`

- **Section titles**: Apparence/Données/Raccourcis clavier/Rétention de
  l'audit/Avancé → Appearance/Data/Keyboard shortcuts/Audit retention/
  Advanced. (Notifications, Layout, Workspaces already English.)
- **Segmented controls**: Sombre/Clair/Confort/Spacieux → Dark/Light/
  Comfy/Spacious. aria-labels: `Thème de l'interface` → `Interface
  theme`, `Densité d'affichage` → `Display density`.
- **Hotkey table**: `Lance la chaîne de décision` → `Run the decision
  chain`; `Ferme la fenêtre de drilldown` → `Close the drilldown
  window`; `Recherche globale (à venir)` → `Global search (coming
  soon)`.
- **All hints + ScreenHeader subtitle** translated.
- **All Phase-2 Placeholder copy** translated. Earlier I'd parked these
  on the theory they'll get rewritten when the screens are actually
  built — but the user is reading them right now, so the small cost of
  translating them is worth it.
- Top doc-comment section index brought into sync.

Tests: Options.test.tsx assertions re-pinned (8 section titles + 4
segmented labels + 2 hotkey descriptions + new `interface theme` /
`display density` aria-labels). 650/650 green, tsc + build clean.

### Latent finding (not fixed this pass)

While auditing density coverage I noticed that `density.fontBody` /
`density.fontHeader` in `tokens.ts` are **unread**. `theme.ts` consumes
`activeDensity.padCard` and `padPanel` (used by `card`, `thStyle`,
`tdStyle`) but never `fontBody`/`fontHeader`. So the "comfy bump" from
the previous commit (12→13 / 11→12) has zero runtime effect; the
visible font-size improvement comes entirely from the global Inter
swap. Wiring fontBody into the shared styles touches `tdStyle`,
`statValue`, `inputStyle` etc. — every screen, with several test
assertions on rendered cell sizes. Deferred until there's appetite for
that refactor; flagged here so the next density change knows it's a
no-op until wired.

---

## 2026-04-19 — UX polish, follow-up: English chrome (drawer + workspace manager)

Branch `ai-schemas-and-audit`. Same intent as the prior nav-labels pass
("English by default"), applied to the remaining FR strings that surface
in the chrome the user actually clicks on.

### Shipped — `d2e872d`

- **ScreenHeader**: settings cog `aria-label` and drawer title default
  `Réglages — {title}` → `Settings — {title}`. Subtitle font 12 → 13 so
  it matches the new comfy body scale.
- **ScreenSettings**: close-button `aria-label` → `Close settings`.
- **ChainMonitor**: explicit `settingsTitle` override translated.
- **WorkspaceManager**: every visible string + every `aria-label` now
  English (`Activate / Active / Rename / Delete / Create / Cancel /
  New workspace / No workspace saved… / Workspace name…`).
- **Tests**: ScreenHeader / ScreenSettings / WorkspaceManager
  re-pinned to the new English strings.

`Options.tsx` Phase-2 placeholder French copy intentionally left alone
(those screens get rewritten when actually built — translating a
placeholder you're about to replace is wasted churn).

650/650 tests + tsc + build green.

---

## 2026-04-19 — UX polish (palette / font / nav symmetry / English labels)

Branch `ai-schemas-and-audit`. Direct user feedback after a first pass
on Phase 4: *"les couleurs sont tres sombres, on se rend pas hyper compte
des infos, c'est peut-être trop petit, on change la police? (on veut
une police pro tradingview), l'affichage des menus n'est pas terrible,
ça manque de symétrie horizontale, et mets les noms des pages en anglais
par défaut."* All five addressed in one commit.

### Shipped — `dc7eb10`

1. **Palette lift (dark)**. `bg 0a0e17 → 0d1117` with a more obvious
   blue-grey hue (still TradingView-ish slate, not pitch-black). Surface
   ladder steps brighter (`151a22 / 1c222d / 252b38`). Text tiers bumped
   to slate-400/300/200/50 so labels actually read against the new
   surfaces. Border tones lifted in proportion (`2a313e / 3d4555`).
2. **Density bump (default = comfy)**. `fontBody 12 → 13`,
   `fontHeader 11 → 12`. Spacious `13 → 14 / 12 → 13`. Compact unchanged.
   Default no longer feels cramped on a 1440p+ desktop.
3. **Inter font**. Sans stack `'IBM Plex Sans' → 'Inter'`. Loaded via
   Google Fonts in `index.html`; body font-family in `index.css` aligned.
   OpenType features `cv11`, `ss01`, `ss03` enabled in `body` for the
   number-friendly Inter variants used across trading UIs.
4. **Nav horizontal symmetry**. `Nav.tsx` primary row swapped from
   flex-row (`logo + tabs + spacer + status`) to a 3-column grid
   (`1fr / auto / 1fr`). Brand pins left, category tab group centers,
   status cluster pins right — chrome no longer feels left-clustered.
   Tab font-size 12 → 13 + inactive weight 400 → 500 for stronger
   contrast against active.
5. **English category labels**. `nav-categories.ts`: `Marchés / Bots /
   Recherche / Informations / Système` → `Markets / Bots / Research /
   Information / System`. Matches the rest of the chrome which is
   already English (`Dashboard`, `Trader`, `Sentinel`, `ANALYST MODE`,
   `LIVE`, etc.).

### Tests

`tests/ui/components/Nav.test.tsx` updated for new English labels and
the new inactive font-weight (500). 650/650 green, type-check + build
clean.

### Files touched

- `src/ui/tokens.ts` (palette, density font sizes, sans stack)
- `index.html` (Google Fonts URL)
- `src/index.css` (body bg + font-family + OpenType features)
- `src/ui/nav-categories.ts` (English labels)
- `src/ui/components/Nav.tsx` (3-col grid + tab font sizing)
- `tests/ui/components/Nav.test.tsx` (label + weight assertions)

---

## 2026-04-19 — UX overhaul, Phase 4 (RTL coverage backfill)

Branch `ux-overhaul`. With every screen on `<ScreenHeader />`, Phase 4
backfills RTL coverage for the 13 screens that had none and fixes one
latent zustand re-render bug uncovered by the tests.

### Shipped

1. **`487abcc` Phase 4a — Sources / Alerts / Quality / Export / Journal**
   - Each gets a small smoke-test file: ScreenHeader title, badge
     variants (active/empty), KPI strip + a store-driven scenario
     (toggle, remove, ready/not-ready, etc.).
   - +18 tests (599 → 617).

2. **`2723829` Phase 4b — VCFlow / Corporate / Scanner**
   - VCFlow: loading → populated badge after mock provider resolves +
     SIMULATED disclaimer + filter wiring.
   - Corporate: loading → badge with bias counts + filter labels +
     SIMULATED disclaimer.
   - Scanner: empty/populated badge + Active/Quiet sections + sing/plur.
   - +11 tests (617 → 628).

3. **`424266f` Phase 4c — Dashboard / Detail / Backtest / Correlation / MacroPulse**
   - Dashboard: initializing badge + READY/NOT-READY label flip + KPI
     strip + watchlist row per instrument.
   - Detail: empty state + populated header (symbol, back) + back-button
     wiring to setScreen('dashboard').
   - Backtest: idle badge + Run Backtest button.
   - Correlation: empty branch (no badge) vs populated branch + legend.
   - MacroPulse: loading vs populated badge with indicator counts.
   - +15 tests (628 → 643).

### Bug fixed along the way

- **`424266f` Detail.tsx zustand re-render loop**. The previous
  `s.patterns[instrumentId] ?? []` selector returned a fresh `[]`
  literal every render, tripping zustand's ref-equality check and
  re-rendering forever. Latent because real navigation always passes
  through `selectInstrument()` and patterns are usually populated, so
  it never fired in the wild — but the RTL test that mounts Detail
  directly with no patterns flushed it out. Replaced with a module-
  level `EMPTY_PATTERNS` constant; selector now reads the raw map
  slice (stable reference) and the per-instrument resolution happens
  in component body.

### Suite stats
- 643 tests across 76 files. All green.
- Type-check + build clean.

### Merged

`ux-overhaul` fast-forwarded into `ai-schemas-and-audit` (the active
integration branch — `master` is still on the pre-bots checkpoint and
will catch up via the next integration PR). UX overhaul is now the
head of the integration branch.

### Phase 4 follow-up — `da6cd5d` hook coverage

Closed the `tests/hooks/` gap (which previously didn't exist):
- `useAnalytics`: nulls when id is null/unknown, returns slice for
  known id.
- `useDataQuality`: empty defaults + reflects store updates.
- `useMarketData`: starts auto-refresh on mount, stops on unmount,
  exposes the dashboard watchlist slice.

+7 tests (643 → 650).

---

## 2026-04-19 — UX overhaul, Phase 3.10 (retrofit Scanner + Correlation + MacroPulse + Backtest)

Branch `ux-overhaul`. The last four screens of the Phase-3 cosmetic
refonte: Scanner (Marchés), Correlation (Recherche), MacroPulse
(Recherche), Backtest (Recherche). With this commit, **every Phase-3
target screen now adopts `<ScreenHeader />`** — Phase 3 is complete.

### Shipped

1. **`25d4318` Scanner + Correlation + MacroPulse + Backtest adopt `<ScreenHeader />`**
   - **Scanner**: badge `{withSignals.length} inst · {signals.length}
     signal(s)` in yellow when active, muted when zero. Subtitle
     describes the grouping logic (active first, then quiet).
   - **Correlation**: badge `{n} instruments`. Both the empty/loading
     branch and the populated branch wrap in a fragment + ScreenHeader
     so the chrome is consistent regardless of state.
   - **MacroPulse**: badge `{indicators.length} ind · {upcomingEvents.length}
     upcoming`. Same dual-branch fragment treatment as Correlation
     (loading state shares the chrome).
   - **Backtest**: badge `running…` / `{trades.length} trades` /
     `idle` driven by run state. Hand-rolled `<h2>` header dropped.
   - All four screens follow the established pattern: outer
     ScreenHeader edge-to-edge, inner content `padding: '14px 20px'`.
   - All 599 existing tests still pass — none of the four had RTL
     coverage; gaps now flagged for Phase 4.
   - Type-check + build clean.

### Phase 3 wrap

That closes Phase 3 — every screen in the app now uses the
standardised `<ScreenHeader />` building block. Phase 4 picks up
the RTL coverage backfill (Journal, Alerts, Sources, Export, Quality,
Dashboard, Detail, VCFlow, Corporate, Scanner, Correlation,
MacroPulse, Backtest) before merging `ux-overhaul → main`.

### Suite stats
- 599 tests across 63 files. All green.

---

## 2026-04-19 — UX overhaul, Phase 3.9 (retrofit VCFlow + Corporate)

Branch `ux-overhaul`. Informations group: both VCFlow and Corporate
adopt `<ScreenHeader />` in a single commit.

### Shipped

1. **`f6efb15` VCFlow + Corporate adopt `<ScreenHeader />`**
   - VCFlow: badge `{n} deals · {n} sectors` in purple. Subtitle
     calls out the data source (mock — adapters Crunchbase / PitchBook
     / CB Insights for live).
   - Corporate: badge `{n} evt · {bullish}↑ · {bearish}↓ · {high} high`
     with inline coloured arrows for bias direction. Subtitle calls
     out the data source (mock — Polygon / Finnhub / EODHD for live).
   - Both screens drop their hand-rolled headers. Inner content
     padding tightened from 16 → 14 to match the established pattern.
   - All 599 existing tests still pass — neither screen had RTL
     coverage; the gap is now flagged for Phase 4.
   - Type-check + build clean.

### Suite stats
- 599 tests across 63 files. All green.

---

## 2026-04-19 — UX overhaul, Phase 3.8 (retrofit Detail)

Branch `ux-overhaul`. Detail screen retrofit. Closes the per-instrument
drilldown — last of the "core" Phase-3 screens (Dashboard / Chain /
Trader / Sentinel / Detail). Informations + remaining Marchés screens
follow.

### Shipped

1. **`d7f349a` Detail adopts `<ScreenHeader />`**
   - Title: dynamic `inst.symbol` (varies per drilldown).
   - Subtitle: `inst.name — inst.exchange` so the user knows what
     they're looking at without parsing the symbol.
   - Badge: live `<StatusBadge>` showing LIVE / STALE / SIM.
   - Actions: price block (mono, big) + 24h change + a compact
     "← back" button. The back button moves into the header instead
     of floating on its own — keeps the screen content tighter.
   - Inner padding tightened 16 → 14 to match the established pattern.
   - All 599 existing tests still pass — no Detail RTL coverage yet
     (gap noted for Phase 4).
   - Type-check + build clean.

### Suite stats
- 599 tests across 63 files. All green.

---

## 2026-04-19 — UX overhaul, Phase 3.7 (retrofit Sentinel)

Branch `ux-overhaul`. Sentinel screen retrofit. Closes the bots
group (Chain + Trader + Sentinel — all three converted).

### Shipped

1. **`568eb8b` Sentinel adopts `<ScreenHeader />`**
   - Title + subtitle replace the yellow hand-rolled header.
   - Badge: `{checks} checks · {vetoed} vetoed · {approved} approved`
     in yellow. The numeric story of the screen at a glance.
   - Actions: the safe-mode toggle (a check input) lives in the
     header so it's always visible — moving it to a settings drawer
     would have hidden the most-important on/off switch in this
     screen. Border colour goes red when active.
   - Inner padding tightened 16 → 14 to match the established pattern.
   - All 599 existing tests still pass — Sentinel.test.tsx assertions
     for the safe-mode label still resolve via getByText.
   - Type-check + build clean.

### Suite stats
- 599 tests across 63 files. All green.

---

## 2026-04-19 — UX overhaul, Phase 3.6 (retrofit Trader)

Branch `ux-overhaul`. Trader screen retrofit. Same template as the
others but with a custom badge + actions composition tuned for an
execution view.

### Shipped

1. **`8425b64` Trader adopts `<ScreenHeader />`**
   - Title + subtitle replace the hand-rolled purple `<div>` header.
   - Badge: `paper · {n} orders · {n} pos` in purple — gives the user
     a constant SIM/dry-run reminder so it's clear nothing is real.
   - Actions: live `net PnL {sum}` colour-coded green/red — surfaces
     the most important number to the screen-glance.
   - Inner padding aligned 16 → 14 to match the pattern.
   - One pre-existing test had to update (Trader.test.tsx empty-state
     assertion looked for the old subtitle text). All 599 tests still
     green after the fixture update.
   - Type-check + build clean.

### Suite stats
- 599 tests across 63 files. All green.

---

## 2026-04-19 — UX overhaul, Phase 3.5 (retrofit ChainMonitor)

Branch `ux-overhaul`. ChainMonitor is the second of the bigger screens
to adopt `<ScreenHeader />`. First real test of the settings drawer
slot — the screen has many controls and the toolbar was getting
crowded.

### Shipped

1. **`10a1dcd` ChainMonitor adopts `<ScreenHeader />`**
   - Title + subtitle replace the implicit "first row is header" pattern.
   - Badge: `last: {outcome}` colour-coded (green=filled, red=vetoed,
     orange=ai-rejected, yellow=order-rejected).
   - Actions slot: compact `ctx: {instrumentId|synthetic}` indicator
     so the user can see at a glance whether the chain is running on
     real market data or a synthetic stub.
   - Settings drawer: Safe Mode + Auto-Run + Auto-Run interval — the
     three controls that were taking ⅓ of the toolbar width. Now
     hidden until the user opens ⚙. Toolbar keeps Run / Clear /
     Export CSV / Export JSON (the actions a user takes per session).
   - Inner padding aligned to 14px 20px to match the pattern.
   - All 599 existing tests still pass — ChainMonitor has dense
     coverage (audit-filter, chain wiring, drilldown) but no header
     selectors, so the rewrite is invisible to the suite.
   - Type-check + build clean.

### Suite stats
- 599 tests across 63 files. All green.

---

## 2026-04-19 — UX overhaul, Phase 3.4 (retrofit Dashboard)

Branch `ux-overhaul`. Phase 3 enters the bigger screens. Dashboard
is the first — highest-traffic single screen of the app.

### Shipped

1. **`c720225` Dashboard adopts `<ScreenHeader />`**
   - Title + subtitle replace the hand-rolled `<h1>` block.
   - Badge: live `updated {fmtAge}` clock (or `initializing`) — gives
     the user a constant signal that data is moving even when the
     KPIs/table aren't visibly changing.
   - Actions slot hosts the bot-readiness widget (label + QualityBar
     + READY/NOT-READY mono label). Same colour logic as before.
   - Inner padding tightened 16 → 14 to match the pattern.
   - All 599 existing tests still pass — Dashboard had no RTL coverage
     (gap noted earlier in NOTES; covered in Phase 4).
   - Type-check + build clean.

### Suite stats
- 599 tests across 63 files. All green.

---

## 2026-04-19 — UX overhaul, Phase 3.3 (retrofit Sources + Export + Quality)

Branch `ux-overhaul`. Three more screens of the Système group adopt
`<ScreenHeader />` — closes out the small-screen pass before tackling
the high-traffic ones (Dashboard / Chain / Trader / Sentinel / Detail).

### Shipped

1. **`97cae6e` Sources + Export + Quality use `<ScreenHeader />`**
   - Sources: header carries `{n}/{total} active` badge (green if any
     provider is `active`, grey otherwise). Subtitle reminds the user
     that provider status is frozen at boot — a reload is required.
   - Export: header carries a `ready` (green) / `waiting for data`
     (grey) badge driven by snapshot count. Subtitle summarises CSV
     vs JSON contents.
   - Quality: header carries a `{n}% ready / not ready` badge driven
     by `readiness.score` and `readiness.ready`. Subtitle summarises
     what the screen scores.
   - All three drop their hand-rolled `<header>` blocks. Inner content
     padding tightened from 16 → 14 to match the established pattern.
   - 599 existing tests still pass — none of these screens had RTL
     coverage (gap noted earlier in NOTES; covered in Phase 4).
   - Type-check + build clean.

### Suite stats
- 599 tests across 63 files. All green.

---

## 2026-04-19 — UX overhaul, Phase 3.2 (retrofit Journal + Alerts)

Branch `ux-overhaul`. Two more screens adopt `<ScreenHeader />`. Both
chosen for size + simplicity (≤120 lines, no nested state machines).

### Shipped

1. **`b56bac3` Journal + Alerts use `<ScreenHeader />`**
   - Journal: header carries the `{n} signal{s}` count as a badge so
     the user can see the queue size without scanning the table. The
     subtitle clarifies that only the 200 most-recent entries render.
   - Alerts: header carries the `{n} active` count as a green badge
     when >0 (greys out at 0). The ShieldAlert icon was redundant
     with the title; removed.
   - Both screens drop their hand-rolled `<header>` blocks. Inner
     content padding tightened from 16 → 14 to match the Options
     pattern.
   - All 599 existing tests still pass — neither screen had RTL
     coverage (gap noted earlier in NOTES; would be a good Phase 4
     follow-up). Type-check + build clean.

### Suite stats
- 599 tests across 63 files. All green.

---

## 2026-04-19 — UX overhaul, Phase 3.1 (retrofit Options to ScreenHeader)

Branch `ux-overhaul`. Phase 3 starts. Phase 3.1 is a one-screen pilot:
retrofit Options.tsx to use the new ScreenHeader. Goal: validate that
the building-block API works for a real screen before adopting it on
the higher-traffic ones (Dashboard / Chain / Trader / Sentinel / Detail).

### Shipped

1. **`02b8c22` Options now uses `<ScreenHeader />`**
   - Removed the inline `<header>` block (h1 + p subtitle).
   - Replaced with `<ScreenHeader title="Options" subtitle="…" />`.
   - Outer wrapper switched from a single padded div to a fragment so
     the header stretches edge-to-edge while the section grid keeps
     the 920px max-width constraint.
   - Inner content padding tightened from 20 → 18 to compensate for
     the 14px header bottom-padding that the new chrome contributes.
   - All 11 Options tests still pass without modification — the
     accessible structure (h1 + section labels) is identical.

### Suite stats
- 599 tests across 63 files. All green.
- Type-check + build clean.

---

## 2026-04-19 — UX overhaul, Phase 2.2 (density tokens applied)

Branch `ux-overhaul`. Phase 2.2 wires the density tokens into the
shared theme styles so the Options → Apparence → Densité toggle has
visible impact across the whole app at module-load.

### Shipped

1. **`ecc3b35` Apply density tokens to card / thStyle / tdStyle**
   - `card.padding`     → `activeDensity.padCard`
   - `thStyle.padding`  → `${activeDensity.padPanel}px 12px`
   - `tdStyle.padding`  → `${max(padPanel - 2, 4)}px 12px`
   - Buttons (btnPrimary / btnSecondary / btnSmall) intentionally
     stay fixed — they're interaction elements, not layout. Same for
     the badge (visual contrast with rows matters more than density
     coherence at that scale).
   - At the default `comfy` density (padCard=14, padPanel=10) the
     visible change is: card padding goes 16 → 14 (a 2px tighten);
     table cell paddings stay where they were (10 / 8). Compact
     tightens to 8/6/4; spacious loosens to 20/14/12.
   - 4 new tests in `theme-density.test.ts` assert the read paths.

### Suite stats
- 599 tests across 63 files (was 595/62). All green.
- Type-check + build clean.

---

## 2026-04-19 — UX overhaul, Phase 2.1 (ScreenHeader + ScreenSettings)

Branch `ux-overhaul`. Phase 2 starts. Phase 2.1 ships the building
blocks; adoption in existing screens is split out into Phase 3 so each
screen's refonte is reviewable independently.

### Shipped

1. **`9425915` ScreenHeader + ScreenSettings building blocks**
   - `src/ui/components/ScreenHeader.tsx` — standardised header for
     every screen. Slots: title, subtitle, badge (right of title),
     actions (right side), settings (per-screen drawer content).
     When `settings` is provided, a ⚙ button toggles the drawer.
   - `src/ui/components/ScreenSettings.tsx` — inline drawer that
     drops in below the header (NOT a modal — the user keeps the
     screen state visible while tweaking). Closes via the X button
     or Escape key (handles both body-focus and inside-drawer focus).
   - 16 new tests. ScreenHeader: chrome (title h1, subtitle present /
     absent), badge + actions slots render passed nodes, ⚙ toggle
     (no settings ⇒ no button, click toggles aria-expanded + drawer
     visibility, custom settingsTitle wins). ScreenSettings: chrome
     (region with title, h2 title, children passthrough), close
     behaviour (X click + Escape from body + Escape from inside-drawer
     focus all call onClose; non-Escape keys ignored).
   - No screen adopts these yet — that's Phase 3 work, one screen
     per commit, easier to review.

### Suite stats
- 595 tests across 62 files (was 579/60). All green.
- Type-check + build clean.

---

## 2026-04-18 — UX overhaul, Phase 1.5 (Workspace store + switcher)

Branch `ux-overhaul`. Phase 1.5 lands the workspace concept end-to-end.

### Shipped

1. **`01b8f5c` Workspaces — store + manager UI**
   - New `src/store/workspaces.ts`. Zustand store with manual
     localStorage persistence (versioned key `nexus.workspaces.v1`).
     Schema: `Workspace = { id, name, createdAt, theme, density }`.
     Mirrors the existing pattern in `prefs.ts` / audit-filter
     (read-on-init + write-on-change, validate-then-default on read).
   - Actions: `createWorkspace`, `renameWorkspace`, `deleteWorkspace`,
     `applyWorkspace`. Apply writes to the prefs keys + queues a
     reload via the same setTimeout(0) pattern as setTheme/setDensity,
     so the rest of the app sees the new palette consistently.
     Defensive: returns false on unknown id; clears activeId if the
     active workspace is deleted.
   - New `src/ui/components/WorkspaceManager.tsx` — list + create
     row + per-row Activer / Renommer / Supprimer actions. Empty
     state explains the concept. Newest-first ordering.
   - Wired into Options.tsx (replaces the Phase 1.5 placeholder).
   - Phase 1.5 only snapshots theme + density. The Workspace shape
     is the only thing future phases need to extend; the manager UI
     iterates the field set generically.

### Suite stats
- 579 tests across 60 files (was 555/58). All green.
- Type-check + build clean.
- 14 new store tests: create (empty-name fallback, persistence,
  stable id), rename (empty no-op, unknown id no-op), delete
  (clears activeId iff active, preserves otherwise), apply (writes
  prefs, flips activeId, returns false on unknown id), persistence
  shape guards (defensive against malformed JSON, bad theme).
- 10 new component tests: empty state, create flow (open input,
  Enter commits, Escape cancels), list rendering (theme/density
  meta, newest-first ordering, active marker + disabled Activer),
  apply / delete / rename (Enter commits, Escape reverts).

---

## 2026-04-18 — UX overhaul, Phase 1.4 (Options screen skeleton)

Branch `ux-overhaul`. Phase 1.4 lands the user-facing Options hub.

### Shipped

1. **`a40d46b` Options screen — 8-section customisation hub**
   - New `src/ui/screens/Options.tsx`. Lazy-loaded via `App.tsx`. Routed
     under the `system` category (Système → Sources / Export / Options).
   - 8 sections in display order:
     Apparence (theme + density, fully wired via `prefs.ts`),
     Données / Notifications / Layout / Rétention audit / Avancé
     (chrome locked + dashed-border placeholder cards explaining what
     each will own — concrete impl deferred to Phase 2),
     Raccourcis clavier (read-only inventory of currently-wired
     hotkeys: r run-chain, Esc drilldown, ⌘K search-to-come),
     Workspaces (placeholder pointing to Phase 1.5).
   - Reusable internal components:
     - `<Segmented>` — accessible segmented control (role=group +
       aria-pressed buttons). No-op when re-clicking the active value
       so we don't queue a useless reload.
     - `<Section>` — icon + title + hint + body. Locked chrome.
     - `<Row>` — label + description + control, with bottom border.
     - `<Placeholder>` — dashed-border stub with one-line note.
   - `Screen` enum gains `'options'`. `nav-categories.ts` adds it under
     `system`. `Nav.tsx` SCREEN_ICONS / SCREEN_LABELS extended (Settings
     icon from lucide).

### Suite stats
- 555 tests across 58 files (was 544/57). All green.
- Type-check + build clean.
- 11 new tests for `<Options />`: chrome (title + 8 sections), Apparence
  segmented behaviour (sombre+clair render, current marked aria-pressed,
  click writes localStorage, re-click is no-op, density round-trips,
  persisted density read on mount), hotkeys inventory (r + Esc shown
  with scope and KBD chips).

---

## 2026-04-18 — UX overhaul, Phase 1.3 (Nav 2 levels + 5 categories)

Branch `ux-overhaul`. Continued the autonomous run. Phase 1.3 of the
big visual + structural refonte landed.

### Shipped

1. **`5afe802` Nav refactor — 2-level top bar with 5 categories**
   - New `src/ui/nav-categories.ts` defines the 5-category map:
     Marchés (dashboard, scanner, correlation, macro), Bots (chain,
     sentinel, trader), Recherche (backtest, quality), Informations
     (vcflow, corporate, alerts, journal), Système (sources, export).
     `detail` (drilldown) maps to Marchés but is hidden from the subnav.
   - `Nav.tsx` rewritten: primary row = brand + 5 category tabs +
     ANALYST MODE + LIVE indicator; secondary row = subscreens of the
     active category (only rendered when ≥2 subscreens). Active
     category derived from current screen via `categoryOf()`.
     Click on a category jumps to its `landingOf()` (first subscreen)
     unless already inside it (no-op).
   - Uses the new `radius` tokens (btn, badge, pill) instead of the
     hard-coded 4/50% values from v1.
   - 14 new tests: 8 for `nav-categories` (shape, completeness, no
     duplication, hidden-screen mapping), 6 net new for `<Nav />`
     (5 categories render, secondary row swaps with category, click
     active category is no-op, secondary tabs use aria-selected,
     detail keeps Marchés subnav active).

2. **`5389b30` fix(build): switch vite.config.ts to vitest/config**
   - Pre-existing TS error `'test' does not exist in type 'UserConfigExport'`
     was breaking `npm run build` since the vitest config block was
     added. Imports now come from `vitest/config` so the augmented
     UserConfig type accepts the `test` key.

### Suite stats
- 544 tests across 57 files (was 530/56). All green.
- Type-check + build clean.

---

## 2026-04-18 — autonomous polish pass (price labels + still-open list)

User authorised a long autonomous run. Cleared every "still open" item
from the previous session's NOTES backlog. Six commits, all passing
type-check + tests + build, all pushed to origin/ai-schemas-and-audit.

### Shipped
−1. **`55f478e` RTL coverage for Nav + 4 small badges (after-arc)**
   - Closes the components gap: was 2/9 covered (Drilldown + PriceChange)
     → 8/9 after this. Only MiniChart + DemoSplash left, both lower-value.
   - `Nav` (7 tests): brand + ANALYST MODE chrome, all 15 nav items
     render as buttons, LIVE/OFFLINE flips with `binanceConnected`,
     click → `setScreen`, NEXUS logo → dashboard, active-tab font weight.
   - `Badges` (12 tests across 4 components): FreshnessDot dead-fallback
     + fresh-glow under a pinned clock + size prop; QualityBar green/
     yellow/red thresholds + showLabel=false + score>1 width cap;
     SeverityBadge colour-per-severity; StatusBadge LIVE-glow vs no-dot
     + unknown-status fallback.

0. **`09dc6c3` RTL coverage for PriceChange (after-arc)**
   - 11 tests covering the null/NaN/Infinity empty-state, ± formatting,
     `format="abs"` vs default `pct`, the recent 24h-disambiguation
     suffix, and the optional title/cursor:help tooltip wiring.

0. **`be2337d` RTL coverage for Sentinel + Trader screens (after-arc)**
   - Both screens were live since 2026-04-19 but had zero RTL coverage
     despite handling business-critical actions (safe-mode toggle,
     accept/dismiss review queue, close position).
   - 9 tests for `<Sentinel />`: empty-state, approval-rate maths,
     safe-mode checkbox round-trip, veto-reasons sort-by-count,
     accept/dismiss queue handlers (with audit-log assertions).
   - 7 tests for `<Trader />`: portfolio cards, fill-rate /
     mean-slippage / rejected counts, open-positions table + close
     button wiring, closed-positions panel + closure breakdown,
     order-blotter status colours.
   - `closePosition` side-effect can't be asserted via `setState`
     fixtures because it routes through the positionManager
     singleton — documented inline. Wiring (button rendered, handler
     bound, no crash) is covered; close logic has its own unit tests.
   - Suite: 491 tests across 52 files (was 475/52). All green.

1. **`91c6ab6` clarify 24h price-change window with suffix + tooltip**
   - User reported NEXUS BTC/USD differed from TradingView/Google.
   - Diagnosis: not a bug. Binance rolling 24h vs Google's
     "since midnight" aggregate — different windows, different sources.
     Math is correct (verified `src/providers/binance/spot.ts` lines
     85-86 and 147-148).
   - Fix is purely cosmetic: `PriceChange` gains `suffix` + `title`
     props. Detail uses `suffix="24h"` + tooltip. Dashboard uses
     tooltip only (column header already says "24h").

2. **`5afd3cb` extract btnSecondary + btnSmall in theme**
   - 7 inline copies of the secondary-button style scattered across
     ChainMonitor / Sentinel / Trader → 2 reusable theme exports.
   - `btnSecondary` (medium ghost outline, sans 12px) and `btnSmall`
     (compact mono, 10px). Colors stay overridable so semantic
     variants (e.g. green "accept") just override border + color.
   - Pure refactor, no behavior change.

3. **`4b40f0c` persist audit filter across reloads**
   - `loadAuditFilter` / `saveAuditFilter` round-trip via
     localStorage under `nexus.auditFilter.v1`. Validates module
     enum + shape + decisionId-string before trusting storage.
     Silent fallback on any failure — cosmetic state.
   - ChainMonitor uses lazy useState initializer + useEffect writer.
     Empty filter clears the storage key.
   - 7 new tests.

4. **`2644968` add 'r' keybind to run the decision chain**
   - Pure `isRunChainShortcut` predicate gates out modifier-held
     variants and form-field/contenteditable targets so typing
     into the audit filter input isn't hijacked.
   - Skipped while drilldown modal is open (modal owns Escape;
     stay out of its way).
   - Run button renders an inline `<kbd>r</kbd>` hint + tooltip.
   - 9 unit tests.

5. **`8528eaf` drilldown polish: copy JSON, jump-to-audit, raw payload**
   - **Copy JSON**: button serialises the full DecisionDrilldown
     (decision + consensus + providers + veto + orders + position +
     auditEntries) and writes to clipboard. Detached-textarea +
     execCommand fallback in non-secure contexts. Flashes
     "copied" / "copy failed" for 1.8s.
   - **Jump-to-audit**: hands the decision id back to the parent
     via `onJumpToAudit?(id)`. ChainMonitor closes the modal and
     scopes the audit panel via a new `decisionId` field on
     AuditFilter. Removable accent-coloured pill renders while the
     scope is active.
   - **Raw audit payload**: `buildDrilldown` now accepts `entries`
     in ctx and surfaces matched ones (`data.decisionId === id`)
     in a folded section. Pretty-printed JSON, max-height scroll,
     hidden behind show/hide. Multi-provider note: per-provider
     `AI_RESPONSE_VALIDATED` entries carry the per-vote id, so they
     won't match the synthesised id — but the synthesised
     `DECISION_CREATED` entry will.
   - 20 new tests across helper + RTL + integration layers.

### State
- Tests: **521/521 pass** (was 439 → 446 → 455 → 475 → 491 → 502 → 521).
- `npm run type-check` clean.
- Vite build clean (251 kB main, 80 kB gzip — unchanged).
- Branch: `ai-schemas-and-audit`, fully up to date with origin.
- UI component RTL coverage: **8/9** (only MiniChart + DemoSplash left).
- UI screen RTL coverage: **3/16** (ChainMonitor + Sentinel + Trader —
  the rest are passive read-only views).

### Backlog cleared
Every "Still open / not parked-by-user" item from the 2026-04-19
arc is now done:
- ~~CRLF renormalise~~ (was already a non-issue)
- ~~btnSecondary extract~~ → 5afd3cb
- ~~persist audit filter~~ → 4b40f0c
- ~~`r` keybind~~ → 2644968
- ~~Drilldown polish (copy / jump / raw)~~ → 8528eaf

### Still open (parked by user)
- **API keys (Anthropic / xAI / OpenAI)** — consensus runs
  single-provider rule-based until set in `.env.local`.
- **Cost / usage tracking per provider** — meaningful only after
  keys are wired and someone is paying API bills.

## 2026-04-17 — multi-provider consensus

### Shipped
- **`446c401` multi-provider consensus orchestrator** — `src/ai/consensus.ts`
  + `tests/ai/consensus.test.ts` (12 tests).
  - Same `OrchestratorResult` shape as `AIOrchestrator`.
  - Fans out N providers via `Promise.allSettled`, validates each
    response independently, tallies by `action`.
  - 1 valid vote → passthrough, `consensusScore = confidence`.
  - Unanimous (or above `minAgreement`, default 0.5) on a non-HOLD
    winner → synthesised decision: mean confidence/size, **median**
    nullable price fields, deduped key factors/invalidators,
    concatenated theses. `requiresHumanReview` if `meanConf < 0.6`
    or `share < 1`.
  - Split below threshold OR HOLD majority → synthesised HOLD,
    confidence capped at `min(0.4, share*0.5)`, `requiresHumanReview = true`.
  - Per-provider failures (throw or schema reject) are logged + skipped,
    not fatal. Only when *all* fail does consensus reject (`ok: false`).

- **`8042fc1` wire consensus when claude is configured**
  - `DecisionChainOptions.ai` widened from `AIOrchestrator` →
    structural `DecisionMaker` interface (just `decide()`).
  - `src/store/chain.ts`: when `VITE_ANTHROPIC_API_KEY` is set, build
    `ConsensusOrchestrator([claude, rule-based])`. No key → single
    rule-based `AIOrchestrator` as before.
  - The rule-based vote now acts as a deterministic floor — Claude
    going off-piste shows up as a HOLD with `requiresHumanReview`.
  - Chain test added that proves structural acceptance.

## 2026-04-19 — Sentinel + Trader screens

### Shipped
- **`3a2bc38` dedicated Sentinel + Trader screens**
  - Splash was still labelling both as SKELETON — stale since the
    Sentinel engine + Trader engine + PositionManager have been wired
    through DecisionChain for weeks. User couldn't "access trader nor
    sentinel" because there was no nav entry.
  - `src/ui/screens/Sentinel.tsx` — rules, approval rate, veto reason
    breakdown with share bars, safe-mode toggle, pending review queue,
    full check history with risk metrics per row.
  - `src/ui/screens/Trader.tsx` — portfolio summary, fill rate + mean
    slippage + rejected count, open positions (with close button),
    closed positions + closure-reason breakdown, full order blotter.
  - Nav: ShieldAlert (Sentinel) + Briefcase (Trader) icons added.
  - Splash BOTS entries updated to ACTIVE with accurate descriptions.
  - Both screens lazy-loaded (~8-9 kB each); main bundle unchanged.

## 2026-04-19 — drilldown + bundle split + RTL

### Shipped
- **`dc50ace` RTL component tests** — drilldown modal (14 tests) +
  ChainMonitor integration (6 tests). Covers click-to-open wiring, close
  handlers (Escape / backdrop / button), correlated artefact rendering,
  per-provider cards for agreed/split consensus, audit filter module +
  query + clear button. Uses `useChainStore.setState` to seed fixtures.

- **`9f6c193` code-split screens with React.lazy**
  - Each of the 14 screens is now its own chunk, loaded on first visit.
  - Main bundle: **775 kB → 250 kB** (gzip 225 → 80). Vite's 500 kB
    warning is gone.
  - Recharts moved to on-demand chunks (CartesianChart ~290 kB,
    ComposedChart ~54 kB) — only loads when a chart-using screen opens.
  - Suspense fallback is a terse "loading…" line. Screens mount in a
    few ms locally; spinners felt like overkill for a prototype.

- **`90678aa` decision drilldown modal** — click any row in "Recent
  decisions" to open a modal with:
  - Action / symbol / confidence / risk / horizon header + consensus badge
  - Full thesis (no truncation)
  - Per-provider breakdown — for agreed consensus, parses the synthesised
    `[providerId] thesis | [providerId] thesis` string back into cards;
    for split HOLDs reuses the keyFactors vote list with per-provider
    confidence.
  - Key factors + invalidators side-by-side
  - Sentinel veto panel (reasons + risk metrics snapshot) when present
  - Associated paper orders (status, side, size, price, fill, slippage)
  - Resulting position (status, entry→mark, PnL, opened time)
  - Escape or backdrop click to dismiss
  - Correlation is by `decisionId` back-link — already carried by
    `SentinelVeto`, `PaperOrder`, `Position`.
- Pure helper `src/ui/decision-drilldown.ts` (+ 11 tests) including the
  agreed-thesis parser that tolerates colon-containing provider ids
  (e.g. `claude:sonnet-4-5`) and `|` characters inside thesis bodies.

### State
- Tests: **439/439 pass** (was 408 → 419 → 439; +11 helper, +20 RTL).
- `npm run type-check` clean.
- Vite build clean, no bundle-size warning.
- Branch: `ai-schemas-and-audit`, up to date with origin.

### Still open
- **CRLF renormalise** — turns out the tree was already normalised on
  disk (`git add --renormalize .` produced zero changes). Non-issue.
- **Cost/usage tracking** — parked alongside API keys.
- **Third LLM provider** — parked alongside API keys.
- **Drilldown polish** (stretch): copy-as-JSON button, jump-to-audit
  link filtering the table to this decision's events, show the raw
  `AI_RESPONSE_VALIDATED` payload inline.
- **Small chores**: extract the 6 copies of the inline secondary-button
  style in ChainMonitor into `btnSecondary` in `theme.ts`; persist
  audit filter across reloads; `r` keybind to run the chain.

User decision (2026-04-19): API keys (Grok, Claude) parked until later.

## 2026-04-18 — big session: UI, tsc, freshness, Grok, filters

### Shipped today (chronological)
1. **`cc47f77`** — ChainMonitor consensus badge. Grey "unanimous" /
   yellow "share NN%" / orange "split NN%" with hover tooltip. Pure
   helpers in `src/ui/consensus-display.ts` + 7 tests.
2. **`d86c7ba`** — tsc cleanup + **real bug fix**: `context-builder.ts`
   was reading `snapshot.timestamp` which doesn't exist. Silent
   `dataAgeMs = 0`; Sentinel's `DATA_TOO_OLD` was a no-op on live data.
   Now reads from `_provenance.timestamp`. `@/types/*` path resolution
   extended to `src/types/*`. `erasableSyntaxOnly` compliance.
3. **`bb97365`** — NOTES update.
4. **`2cd4903`** — **Grok provider**. xAI chat-completions endpoint,
   Bearer auth, `response_format: {type: 'json_object'}`. Same
   retry/timeout/abort shape as Claude. Provider list in store/chain.ts
   is now dynamic: builds from whichever `VITE_*_API_KEY` values are
   set, then hands to the consensus orchestrator. 10 tests.
   - **To activate Grok**: add `VITE_XAI_API_KEY=xai-...` to `.env.local`.
     Optional: `VITE_XAI_MODEL=grok-4-fast` (default `grok-4`).
5. **`37eedf2`** — per-provider confidence in the consensus tooltip.
   keyFactors for split HOLDs now encode `${id}:${ACTION}:${conf}`.
   Parser tolerates legacy 2-segment shape too, and handles
   colon-containing provider ids (e.g. `claude:sonnet-4-5`).
6. **`a70ccf3`** — audit trail filter. Module select (derived from
   on-screen entries) + case-insensitive substring search against
   eventType + summary. Pure helpers in `src/ui/audit-filter.ts`,
   10 tests.

### State
- Tests: **408/408 pass** (was 366 at the start of this arc, +42).
- `npm run type-check` clean.
- Vite build clean (only the bundle-size warning).
- Branch: `ai-schemas-and-audit`, **fully up to date with origin**.

### Still open
- **Bundle size** (~760 kB main chunk). React.lazy the screens, split
  Recharts — low priority for a prototype.
- **CRLF renormalisation** (`git add --renormalize .`). Noisy diff,
  zero runtime impact. Do in isolation.
- **UI tests with React Testing Library** (peaufinage #11). The
  helpers are tested; the components themselves aren't. Would cover
  the consensus badge render and the audit filter wiring.
- **Cost/usage tracking** per provider — Claude + Grok both return
  token usage in responses. Useful once someone's actually paying
  API bills. Skipped today because not urgent for paper trading.
- **Decision drilldown modal** — flat decision rows could expand to
  show full thesis, all provider theses side-by-side, veto reasons,
  fill detail. Medium-sized UI project.
- **Second provider setup (when the user wants one)**: OpenAI / a
  second Claude variant. The `llmProviders.push(...)` pattern in
  store/chain.ts makes this a ~5-line addition once the provider
  module exists.

### Shipped
- **`cc47f77` surface consensus disagreement in ChainMonitor**
  - `src/ui/consensus-display.ts` — `inspectConsensus`,
    `consensusLabel`, `consensusTooltip`. Detects via
    `_source === 'ai_consensus'`. For split HOLDs, parses
    `keyFactors` entries (`${providerId}:${ACTION}`) into a
    structured vote list.
  - 7 helper tests + render integration in Recent decisions panel:
    grey "unanimous", yellow "share NN%", orange "split NN%" with
    a hover tooltip listing per-provider votes.

- **`d86c7ba` make tsc clean + fix silent dataAgeMs=0 bug**
  - `tsconfig.app.json`: `@/types/*` now resolves to both
    `packages/shared-types/src/*` AND `src/types/*`. Without that
    addition, the chain types (decision, order, position, audit)
    didn't resolve and tsc spammed errors.
  - **Real bug**: `context-builder.ts` was reading
    `snapshot.timestamp` — a field that doesn't exist on
    `MarketSnapshot`. Real-runtime value: `undefined` →
    `Date.parse(undefined)` → `NaN` → `dataAgeMs` silently 0.
    Sentinel's `DATA_TOO_OLD` rule has been a no-op on live data
    the whole time. Now reads from `_provenance.timestamp`.
  - Synthetic fallback in `store/chain.ts` now constructs a
    complete `MarketSnapshot` (with `_provenance` + `_quality`)
    instead of casting a partial literal `as never`.
  - `erasableSyntaxOnly` compliance — `AIOrchestrator` and
    `DecisionChain` parameter properties → explicit field decls.
  - `npm run type-check` now exits clean.

### State
- Tests: **386/386 pass** (was 379 at start of today).
- `npm run type-check` clean.
- Vite build clean.
- Branch: `ai-schemas-and-audit`, **all up to date with origin**.

### Next moves (post-cleanup)
1. **Wire a second real provider** — peaufinage #21. The consensus
   layer is wired and ready; this is a `providers: [...]` line
   change in `store/chain.ts`. **Needs user input** on which
   provider (OpenAI, Grok, another Claude variant?). Likely needs
   a new `src/ai/providers/<name>.ts` modeled on `claude.ts` with
   the same retry/timeout shape.
2. **Bundle size warning** — vite reports the main chunk is 760 kB
   (over the 500 kB threshold). Could split lazy: ChainMonitor,
   Recharts, etc. Low priority for a prototype.
3. **CRLF warnings** — git keeps warning about CRLF→LF on first
   touch. The `.gitattributes` is in place; the warnings are
   informational. Could batch-renormalise once with
   `git add --renormalize .`.

### Conventions reminder (so I stay consistent)
- All new code: `_source` + `_status` + `_provenance` on data-bearing types.
- No free-form text → execution. Validate with `validateTradeDecision`
  before trusting anything from a provider.
- Audit logs use `auditLogger.log(module, eventType, summary, data)`.
  Schema rejects → `AI_RESPONSE_REJECTED`. Provider throws →
  `SYSTEM_ERROR`. Successful validation → `AI_RESPONSE_VALIDATED`,
  followed by exactly one `DECISION_CREATED` per consensus call.
- HOLD decisions must carry `size: 0` to satisfy the schema (learned
  the hard way writing the consensus tests).
