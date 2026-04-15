# NEXUS — Avancement du Projet

> Dernière mise à jour : 15 avril 2026

---

## Vision

NEXUS est un **dashboard de monitoring multi-actifs** conçu pour l'analyse et la recherche.
Le projet cible une architecture **3 bots** :

| Bot | Rôle | Statut |
|-----|------|--------|
| **Analyst** | Monitoring temps réel, signaux, analytics | **Actif** — 100% fonctionnel |
| **Sentinel** | Santé système, veto sur les trades | **Squelette** — veto engine opérationnel |
| **Trader** | Consommation de signaux, exécution Freqtrade | **Squelette** — pipeline dry-run |

**Règle fondamentale** : Aucun trading live dans le codebase actuel. Mode ANALYST MODE uniquement.

---

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 19 + TypeScript 5.9 (strict) |
| Build | Vite 8 |
| State | Zustand 5 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Tests | Vitest 4 + jsdom + fake-indexeddb |
| Data live | Binance WebSocket + REST (spot + futures) |
| Data mock | Générateur interne pour tous les non-crypto |
| Persistence | IndexedDB (snapshots, candles, signaux) |
| Path aliases | `@/*` → src, `@nexus/*` → packages/apps |

---

## Chronologie des Commits

| Date | Commit | Description |
|------|--------|-------------|
| 5 avril 2026 | `e49821d` | **Checkpoint initial** — Analyst Core complet (115 fichiers, 15 538 lignes) |
| 5 avril 2026 | `35e99a0` | Extraction des packages partagés pour monorepo |
| 5 avril 2026 | `b6912b5` | Fix des 24 erreurs TypeScript (unused imports, DataProvenance) |
| 5 avril 2026 | `e87e22c` | Ajout du Sentinel Bot (veto engine + health monitor) |
| 5 avril 2026 | `90876bd` | Ajout du Trader Bot (signal consumer + Freqtrade bridge) |
| 6 avril 2026 | `04c830c` | Demo splash overlay au premier chargement |
| 7 avril 2026 | `be2c2d0` | +89 tests (alerts, export, normalization, storage, generator) |
| 15 avril 2026 | PR `ai-schemas-and-audit` | **Decision Chain complète** : AI schema validator + orchestrator, SentinelEngine (11 règles), TraderEngine (PaperOrder), DecisionChain, PositionManager (mark-to-market + SL/TP), persistence IDB, Claude API provider, écran Chain avec auto-run |

---

## Architecture du Monorepo

```
nexus/
├── src/                          Analyst Core (Bot #1)
│   ├── ui/
│   │   ├── components/           8 composants (Nav, StatusBadge, QualityBar, DemoSplash...)
│   │   ├── screens/              13 écrans
│   │   └── theme.ts              Thème TradingView dark
│   ├── store/market.ts           Zustand store (9 actions, refresh cycle 7 étapes)
│   ├── hooks/                    useMarketData, useAnalytics, useDataQuality
│   ├── analytics/                RSI, Bollinger, EMA, structure, volatilité, corrélation, patterns
│   ├── signals/                  Détecteur + bridge corporate/macro
│   ├── alerts/                   Engine + rules + notifier
│   ├── backtest/                 Engine complet avec stats P&L
│   ├── quality/                  Scoring + readiness + audit
│   ├── corporate/                Types + mock (15 événements)
│   ├── macro/                    Types + mock (22 indicateurs + 11 événements calendrier)
│   ├── vcflow/                   Types + mock (deals VC)
│   ├── providers/
│   │   ├── binance/              Spot + Futures (WebSocket + REST)
│   │   ├── mock/                 Générateur + 19 instruments
│   │   ├── registry.ts           7 providers définis (seul Binance actif)
│   │   └── base.ts               Proxy → @nexus/shared-clients
│   ├── normalization/            Binance → types internes (instrument, snapshot, candle)
│   ├── export/                   CSV + JSON
│   ├── storage/                  IndexedDB wrapper (snapshots, candles, signals)
│   └── infra/                    Env config + maintenance + health proxy
│
├── packages/                     Packages partagés (@nexus/*)
│   ├── shared-types/             7 fichiers types (instrument, market, signal, alert...)
│   ├── shared-utils/             math (safeDivide, isValidNumber), format, freshness
│   ├── shared-signals/           SIGNAL_CONFIGS (23 types), SIGNAL_THRESHOLDS
│   ├── shared-clients/           BaseProvider interface
│   └── shared-infra/             Health monitor (types + state + API)
│
├── apps/                         Bots secondaires
│   ├── sentinel/                 Bot #2 — Monitoring + Veto
│   │   ├── src/monitor.ts        Health polling loop (mémoire, providers)
│   │   ├── src/veto.ts           3 checks : santé, drawdown, positions max
│   │   └── src/index.ts          Barrel export
│   └── trader/                   Bot #3 — Exécution
│       ├── src/types.ts          TradeSignal, Order, Position, FreqtradeConfig
│       ├── src/signal-consumer.ts  Filtre (type, strength, direction, âge)
│       ├── src/freqtrade-bridge.ts REST API stub (dry-run uniquement)
│       ├── src/pipeline.ts       Filter → Veto Sentinel → Execute Freqtrade
│       └── src/index.ts          Barrel export
│
└── tests/                        28 fichiers de tests
    ├── analytics/                3 fichiers (correlation, indicators, patterns)
    ├── alerts/                   3 fichiers (engine, rules, notifier)
    ├── backtest/                 1 fichier (engine)
    ├── corporate/                1 fichier (mock)
    ├── export/                   2 fichiers (csv, json)
    ├── infra/                    1 fichier (health)
    ├── macro/                    1 fichier (mock)
    ├── normalization/            3 fichiers (instrument, snapshot, candle)
    ├── providers/                2 fichiers (instruments, generator)
    ├── quality/                  1 fichier (scoring)
    ├── sentinel/                 2 fichiers (monitor, veto)
    ├── signals/                  2 fichiers (detector, corporate-bridge)
    ├── storage/                  1 fichier (db)
    ├── trader/                   3 fichiers (signal-consumer, freqtrade-bridge, pipeline)
    ├── utils/                    1 fichier (math)
    └── vcflow/                   1 fichier (mock)
```

---

## Les 13 Écrans

| # | Écran | Description |
|---|-------|-------------|
| 1 | **Dashboard** | Watchlist 19 instruments, KPIs, sparklines, qualité, statut |
| 2 | **Detail** | Vue instrument : chart composé, analytics, signaux, patterns |
| 3 | **Scanner** | Instruments groupés par nombre de signaux actifs |
| 4 | **Alerts** | Règles d'alerte avec sévérité, toggle on/off, suppression |
| 5 | **Correlation** | Matrice de corrélation inter-instruments |
| 6 | **Backtest** | Config + exécution backtest, chart P&L, stats complètes |
| 7 | **Corporate** | Événements corporate (earnings, M&A, regulatory...) |
| 8 | **VC Flow** | Deals venture capital, répartition par secteur |
| 9 | **Macro** | Indicateurs macro + calendrier économique |
| 10 | **Quality** | Score de readiness, métriques par instrument |
| 11 | **Sources** | Statut des providers (actif/mock/erreur/déconnecté) |
| 12 | **Journal** | Log des signaux détectés (200 max) |
| 13 | **Export** | Export CSV/JSON des données |

---

## Les 19 Instruments

| Asset Class | Instruments |
|-------------|-------------|
| **Crypto Spot** | BTC/USD, ETH/USD, SOL/USD, BNB/USD, XRP/USD |
| **Crypto Perp** | BTC-PERP, ETH-PERP |
| **US Equity** | AAPL, MSFT, NVDA, TSLA |
| **Forex** | EUR/USD, GBP/USD, USD/JPY |
| **Index** | S&P 500, NASDAQ 100 |
| **Commodity** | Gold (XAU), Silver (XAG), WTI, Natural Gas, Copper |

---

## Les 23 Types de Signaux

### Techniques (10)
| Signal | Direction | Description |
|--------|-----------|-------------|
| RSI_OVERSOLD | Bullish | RSI < 30 |
| RSI_OVERBOUGHT | Bearish | RSI > 70 |
| BB_SQUEEZE | Neutral | Bandwidth < 2% |
| BB_BREAKOUT_UP | Bullish | Prix au-dessus de la bande haute |
| BB_BREAKOUT_DOWN | Bearish | Prix en-dessous de la bande basse |
| HIGH_VOLUME | Neutral | Volume > 2.5x moyenne 20 périodes |
| EMA_CROSS_BULL | Bullish | EMA 20 croise au-dessus EMA 50 |
| EMA_CROSS_BEAR | Bearish | EMA 20 croise en-dessous EMA 50 |
| STRUCT_BULL | Bullish | Higher highs + higher lows |
| STRUCT_BEAR | Bearish | Lower highs + lower lows |

### Corporate (5)
| Signal | Description |
|--------|-------------|
| CORP_EARNINGS_SURPRISE | Beat/miss vs consensus |
| CORP_GUIDANCE_CHANGE | Guidance relevée/abaissée |
| CORP_INSIDER_ACTIVITY | Achat/vente insider |
| CORP_MA_EVENT | M&A, buyback, secondary offering |
| CORP_REGULATORY | Litige ou pression réglementaire |

### Macro (3)
| Signal | Description |
|--------|-------------|
| MACRO_RATE_CHANGE | Décision de taux ou shift de rendement |
| MACRO_INFLATION_SHIFT | Surprise inflation (CPI, PCE...) |
| MACRO_SENTIMENT_SHIFT | Shift sentiment (VIX, DXY, confiance consommateur) |

---

## Decision Chain (bot pipeline)

```
Market snapshot → AnalystContext → AIOrchestrator → SentinelEngine → TraderEngine → PositionManager
                         ↓                ↓                ↓                ↓                ↓
                    contextHash    schema-validé    11 règles veto    PaperOrder      mark-to-market
                                                                                       SL/TP auto-close
                                                                ↓
                                                         AuditLogger (IndexedDB persisted)
```

- **AI providers** : `rule-based` (déterministe, fallback) + `claude` (Anthropic API, opt-in via `VITE_ANTHROPIC_API_KEY`)
- **Sentinel rules** : drawdown, exposure, size, data quality, data age, latency, confidence, consensus, broker, safe mode, daily loss, daily trades, human review, manual block
- **Persistence IDB** : `decisions`, `vetos`, `orders`, `positions`, `audit` (survivent aux reloads)
- **Auto-run** : bouton UI déclenche la chaîne toutes les 5s/15s/30s/60s

---

## Pipeline de Données (Refresh Cycle)

Le store exécute un cycle complet toutes les 5 secondes :

```
1. Fetch snapshots + candles  (Binance live ou mock fallback)
2. Compute analytics           (RSI, BB, EMA, volume, ATR)
3. Detect structure            (HH/HL, LH/LL) + volatility regimes
4. Detect signals              (10 techniques + 5 corporate + 3 macro)
5. Pattern recognition         (si ≥30 bougies)
6. Correlation matrix          (inter-instruments)
7. Quality assessment          (completeness, freshness, reliability)
8. Alert evaluation            (7 règles par défaut)
9. Persist to IndexedDB        (non-bloquant)
```

---

## Couverture de Tests

| Module | Fichiers | Tests |
|--------|----------|-------|
| analytics/ | 3 | 598 lignes |
| alerts/ | 3 | 278 lignes |
| backtest/ | 1 | 340 lignes |
| corporate/ | 1 | 56 lignes |
| export/ | 2 | 120 lignes |
| infra/ | 1 | 73 lignes |
| macro/ | 1 | 76 lignes |
| normalization/ | 3 | 268 lignes |
| providers/ | 2 | 178 lignes |
| quality/ | 1 | 134 lignes |
| sentinel/ | 2 | 139 lignes |
| signals/ | 2 | 319 lignes |
| storage/ | 1 | 81 lignes |
| trader/ | 3 | 234 lignes |
| utils/ | 1 | 83 lignes |
| vcflow/ | 1 | 58 lignes |
| **Total** | **28** | **275 tests, tous pass** |

---

## Chiffres Clés

| Metric | Valeur |
|--------|--------|
| Erreurs TypeScript | **0** |
| Tests | **340 / 39 fichiers** |
| Build production | **209 KB** gzip |
| Fichiers source | ~98 |
| Lignes de code | ~10 000 (source) + ~3 000 (tests) |
| Instruments | 19 (6 asset classes) |
| Types de signaux | 23 |
| Écrans | 13 |
| Packages @nexus/ | 5 |
| Bots | 3 |

---

## Ce Qui Reste à Faire

### Court terme
- [ ] Tests UI (composants React + écrans) — nécessite React Testing Library
- [ ] Tests hooks (useMarketData, useAnalytics, useDataQuality)
- [ ] Tests providers/binance (spot, futures, WebSocket) — nécessite mocking HTTP

### Moyen terme
- [ ] Sentinel : intégration avec vrais providers (health checks réseau)
- [ ] Trader : implémentation réelle du bridge Freqtrade (HTTP calls)
- [ ] Ajout d'instruments (plus de crypto, actions EU, obligations)
- [ ] Données corporate/macro en temps réel (APIs Polygon, Finnhub, FRED)

### Long terme
- [ ] Déploiement statique (Vercel, Netlify, ou VPS)
- [ ] Séparation en vrai monorepo (npm workspaces ou turborepo)
- [ ] Communication inter-bots (message bus ou shared state)
- [ ] Dashboard Sentinel indépendant
- [ ] Mode Trader avec Freqtrade live (paper trading d'abord)
