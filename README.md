# NEXUS

> Multi-asset monitoring + decision dashboard. Live market data → analytics → AI decisions → paper trading,
> all under the same roof, all client-side.

[![tests](https://img.shields.io/badge/tests-920%20passing-brightgreen)](./NOTES.md)
[![build](https://img.shields.io/badge/build-clean-brightgreen)](#getting-started)
[![readiness](https://img.shields.io/badge/readiness-internal--use-yellow)](./READINESS.md)

**📋 New here?** Start with [`READINESS.md`](./READINESS.md) — visual checklist of what's shipped vs what's still needed before going public.

**📓 Tracking changes?** Read [`NOTES.md`](./NOTES.md) — line-by-line session log of every commit.

---

## What it does

NEXUS pulls live market data from multiple exchanges, runs technical + structural + volatility analytics on it,
detects signals, runs them through an AI orchestrator (Claude + Grok consensus, with rule-based fallback),
gates the AI's output through a Sentinel risk-veto layer, then routes survivors to a paper trader.

Every step is auditable: the AI's raw payload, the consensus logic, the veto reasons, the final order — all
logged in an audit journal you can drill into from any decision.

### Asset coverage

| Class | Instruments | Live source |
|---|---|---|
| Crypto spot | BTC / ETH / SOL — USD | Binance · Coinbase · Kraken |
| Crypto perp | BTC / ETH | Binance Futures |
| US equities | AAPL · MSFT · NVDA · TSLA | 🟡 Mock (broker TBD) |
| Forex | EUR/USD · GBP/USD · USD/JPY | 🟡 Mock |
| Indices | SPX · NDX | 🟡 Mock |
| Commodities | XAU · XAG · WTI · NG · HG | 🟡 Mock |

Adding a new live source = implement `BaseProvider`, add to `createRegistry()`, extend the instrument
mapping. The fallback chain (binance → coinbase → kraken → mock) makes new sources additive.

---

## Getting started

```bash
git clone https://github.com/8yanks/nexus
cd nexus
npm install
npm run dev          # Vite dev server on :5173
```

That's it for read-only crypto monitoring — Binance / Coinbase / Kraken don't need API keys for public market data.

### Optional: AI orchestration

Drop a `.env.local` at the repo root:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_ANTHROPIC_MODEL=claude-sonnet-4-5    # default
VITE_XAI_API_KEY=xai-...                  # optional, enables consensus
VITE_XAI_MODEL=grok-4                     # default
```

Without keys, the chain falls back to the rule-based provider — fully functional, just less interesting decisions.

### Optional: equities/forex/macro

```env
VITE_POLYGON_API_KEY=...                  # equities + forex (planned)
VITE_FINNHUB_API_KEY=...                  # corporate events (planned)
VITE_FRED_API_KEY=...                     # macro indicators (planned)
```

The provider scaffolding exists in `src/providers/` — these aren't wired live yet (see READINESS.md).

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Vitest in watch mode |
| `npm test -- --run` | One-shot test run (CI-style) |
| `npm run type-check` | TypeScript only, no build |
| `npm run lint` | ESLint over the whole repo |

---

## Architecture in 30 seconds

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Providers   │  →   │  Analytics   │  →   │   Signals    │
│ binance · cb │      │ RSI · BB · DC│      │ RSI_OS · BB_*│
│ kraken · mock│      │ EMA · ATR ...│      │ DC_BREAKOUT_*│
└──────────────┘      └──────────────┘      └──────┬───────┘
                                                   │
       ┌───────────────────────────────────────────┘
       ↓
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ AI Orchestr. │  →   │   Sentinel   │  →   │ Paper Trader │
│ Claude + Grok│      │ 5 veto rules │      │ Slippage,    │
│ rule fallback│      │ daily loss…  │      │ commissions  │
└──────────────┘      └──────────────┘      └──────────────┘
       │                     │                     │
       └─────────────────────┴─────────────────────┘
                             ↓
                      ┌──────────────┐
                      │  Audit Log   │
                      │ Drilldown UI │
                      └──────────────┘
```

Data lives in:
- **Zustand store** for hot state (snapshots, candles, analytics, signals).
- **IndexedDB** for cold storage (last N days of snapshots/candles/signals).
- **localStorage** for UI prefs (theme, density, screen, timeframe, picker toggles).

Every state field has a serialization story so reloads don't lose context.

---

## Repo layout

```
src/
  ai/            # Claude + Grok providers, consensus orchestrator, schemas
  alerts/        # Alert rules, evaluation engine, notifier
  analytics/     # RSI, EMA, ATR, BB, Donchian, structure, patterns, correlation
  audit/         # Decision audit logger
  backtest/      # Engine, types, config persistence
  chain/         # AI → Sentinel → Trader pipeline
  hooks/         # React hooks (useMarketData, useAnalytics, useDataQuality)
  infra/         # env config
  normalization/ # Per-provider symbol + payload normalization
  providers/     # binance/, coinbase/, kraken/, mock/, registry
  quality/       # Data quality scoring + readiness
  sentinel/      # Risk veto engine
  signals/       # Signal types, detector
  storage/       # IndexedDB wrappers (snapshots, candles, signals, audit)
  store/         # Zustand market store
  trader/        # Paper trader engine + position manager
  types/         # Cross-cutting types
  ui/            # screens/, components/, theme, keybinds, memory helpers
  utils/         # format, math
packages/
  shared-types/    # Cross-app type definitions
  shared-signals/  # SIGNAL_CONFIGS, SIGNAL_THRESHOLDS
  shared-utils/    # Pure helpers usable from apps
  shared-clients/  # BaseProvider interface
  shared-infra/    # Cross-app infra
apps/
  sentinel/      # Standalone sentinel-as-service
  trader/        # Standalone trader-as-service
tests/           # Mirrors src/ structure
```

---

## Status

**Today: 920 / 920 tests passing**, type-check + build clean, branch `ai-schemas-and-audit`.

For a full breakdown of what's working, what's partial, and what's blocking a public launch,
see [`READINESS.md`](./READINESS.md).

---

## Disclaimer

This software is **paper trading only**. It does not execute real orders against any broker.
The AI decision pipeline is for research and education — **nothing here is financial advice**,
and you assume full responsibility for any decisions you make based on its output.
