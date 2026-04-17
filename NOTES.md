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

### State
- Tests: **379/379 pass** (was 366 at start of session).
- Vite build clean.
- Branch: `ai-schemas-and-audit`, ahead of origin by **2 commits**
  (`446c401`, `8042fc1`) — **NOT pushed yet**.

### Obvious next moves
1. **Push the two commits** to `origin/ai-schemas-and-audit`.
2. **ChainMonitor UI: surface consensus disagreement.** The data
   flows through but the panel doesn't visually distinguish a
   Claude-vs-rules HOLD from a HOLD the model returned directly.
   - `decision.consensusScore < 1` + `modelSource.startsWith('consensus[')`
     means the providers split.
   - Add a small badge on the decision row (e.g. "split 0.50") and
     maybe a tooltip listing the per-provider votes. The per-provider
     votes are in `keyFactors` for synthesised HOLDs (formatted as
     `${providerId}:${action}`) — could parse those for the tooltip.
3. **Second real provider (Grok / OpenAI / etc.)** — peaufinage item
   #21. With consensus already wired, adding a second LLM is now a
   `providers: [...]` line change.
4. **Pre-existing ts dirt** noticed but out of scope:
   `tsc --noEmit -p tsconfig.app.json` reports `@/types/*` resolution
   failures and the `private readonly opts` parameter property in
   `src/chain/index.ts:55` trips `erasableSyntaxOnly`. Vite + vitest
   both compile fine, so this is config-only — worth a separate sweep.

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
