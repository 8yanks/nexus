# Session notes

## 2026-04-18 — autonomous polish pass (price labels + still-open list)

User authorised a long autonomous run. Cleared every "still open" item
from the previous session's NOTES backlog. Six commits, all passing
type-check + tests + build, all pushed to origin/ai-schemas-and-audit.

### Shipped
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
- Tests: **491/491 pass** (was 439 → 446 → 455 → 475 → 491).
- `npm run type-check` clean.
- Vite build clean (251 kB main, 80 kB gzip — unchanged).
- Branch: `ai-schemas-and-audit`, fully up to date with origin.

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
