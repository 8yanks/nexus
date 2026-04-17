# Session notes

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

## 2026-04-18 — UI badge + tsc cleanup + freshness bug

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
