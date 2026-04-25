# NEXUS — Production Readiness Checklist

> **Pour Yanis & son associé** — état complet de l'app au **2026-04-26**.
> Mis à jour à chaque session par l'agent autonome. La source de vérité ligne-par-ligne reste `NOTES.md`.

---

## 🚦 Verdict en une ligne

| Aspect | État | Détail |
|---|---|---|
| **Code & tests** | 🟢 Vert | 938/938 tests, type-check clean, build clean |
| **Données live (crypto)** | 🟢 Opérationnel | Binance + Coinbase + Kraken connectés, fallback chain en place |
| **Données live (equities/forex)** | 🔴 Mock seulement | Aucun broker câblé pour AAPL/MSFT/EUR-USD/etc. |
| **AI / Decision pipeline** | 🟡 Câblé mais inactif | Orchestrator + Sentinel + Trader fonctionnent mais clés API non fournies |
| **Trader / Exécution réelle** | 🔴 Paper-only | Pas de broker exécution branché — le PaperTrader sert de référence |
| **Persistance long terme** | 🟡 Local only | IndexedDB pour candles/snapshots/signals, pas de backend partagé |
| **Auth / multi-utilisateur** | 🔴 Aucun | App single-user, pas de login |
| **Déploiement** | 🔴 Pas configuré | Aucun host configuré, pas de CI/CD |

**Verdict global : 🟡 prêt pour usage interne, pas prêt pour mise en service publique.**

---

## ✅ Ce qui est shipped et fonctionne

### 📊 Données de marché

- **Binance Spot + Futures** — REST seed + WebSocket live, watchdog heartbeat (force reconnect après 30s de silence), reconnect exponentiel.
- **Coinbase Exchange** — REST seed + WebSocket ticker, même watchdog que Binance.
- **Kraken** — REST polling (3 paires majeures, 1 req/sec safe).
- **Mock provider** — fallback automatique pour tout instrument sans live source. Génère des candles plausibles pour 19 instruments multi-asset (crypto, equities, forex, indices, commodities).
- **Provider chain** — par instrument : binance → coinbase → kraken → mock. Chaque maillon gated par son `*Connected` flag.
- **Multi-timeframe** — picker `1m / 5m / 15m / 1h / 4h / 1d` sur Detail. Cache TTL 60s par (instrument, TF) pour les TFs non-WS. Persistance localStorage.

### 📈 Charts & analytics

- **TradingViewChart** (lightweight-charts 5.1) — candles + volume + EMA + crosshair tooltip.
- **Live-tick pulse indicator** — badge top-right qui passe vert→jaune→rouge selon la fraîcheur du dernier setData.
- **Auto-snap to real-time** — la vue suit la dernière bougie quand l'utilisateur est au bord droit, sans casser le scroll manuel.
- **Bollinger Bands overlay** — toggle persistant (`BB`).
- **Donchian Channels overlay** — toggle persistant (`DC`).
- **Backtest trade markers** — toggle persistant (`BT N`), apparaît uniquement quand un backtest existe pour l'instrument courant.
- **Hotkeys timeframe** — `1 / 5 / q / h / 4 / d`.

### 🧪 Indicators & signals

| Indicator | Fonction | Couvert en signal ? |
|---|---|---|
| RSI(14) | `calcRSI` | ✅ `RSI_OVERSOLD` / `RSI_OVERBOUGHT` |
| EMA 20 / 50 / 200 | `calcEMA` + `calcEMASeries` | ✅ `EMA_CROSS_BULL` / `EMA_CROSS_BEAR` |
| ATR(14) | `calcATR` | ⚪ Affichage seul |
| VWAP | `calcVWAP` | ⚪ Affichage seul |
| Bollinger Bands | `calcBollinger` + `calcBollingerSeries` | ✅ `BB_SQUEEZE` / `BB_BREAKOUT_UP/DOWN` |
| Donchian Channels | `calcDonchian` + `calcDonchianSeries` + `calcDonchianBreakout` | ✅ `DC_BREAKOUT_UP/DOWN` + `DC_MID_CROSS_UP/DOWN` |
| Z-Score | `calcZScore` | ⚪ Affichage seul |
| Relative volume | `calcRelativeVolume` | ✅ `HIGH_VOLUME` |
| Market structure | `detectStructure` | ✅ `STRUCT_BULL` / `STRUCT_BEAR` |
| Patterns (HS, double top/bot, triangles) | `detectPatterns` + `patternsToSignals` | ✅ `PATTERN_DOUBLE_TOP/BOTTOM` + `PATTERN_HEAD_SHOULDERS` + `PATTERN_INV_HEAD_SHOULDERS` + `PATTERN_ASCENDING/DESCENDING_TRIANGLE` |
| Volatility regime | `detectVolatilityRegime` | ⚪ Affichage seul |
| Correlation matrix | `computeCorrelationMatrix` | ⚪ Affichage seul |

### 🔬 Backtesting

- Engine déterministe avec stop-loss, take-profit, trailing stop, max bars.
- 13 stats (Sharpe, profit factor, max drawdown, win rate, expectancy, etc.).
- Equity curve + trade markers sur le candle chart de l'instrument testé.
- **Persistance config** — la stratégie tunée survit aux reloads.
- **"View on chart" button** — un click → Detail s'ouvre avec les markers visibles.
- **CSV export** — trades téléchargeables en un click.
- **Recent backtests strip** — chip horizontal au-dessus des résultats, un par instrument backtesté, click pour flipper sans re-runner. Color-coded par return %.
- **Detail ↔ Backtest navigation bidirectionnelle** — "view on chart →" depuis les résultats Backtest (markers BT pré-activés), et "backtest" depuis le ScreenHeader Detail (config persistée pré-flippée vers l'instrument courant).

### 🤖 AI / Décision

- **Schémas Zod** pour les sorties Claude / Grok (validation stricte).
- **Consensus orchestrator** — agrège plusieurs providers, calcule majority + confidence.
- **DecisionChain** — pipeline AI → Sentinel veto → Trader execution avec audit complet.
- **Audit logger** — chaque décision tracée avec hash de contexte, raw payload AI, veto reasons.
- **Decision drilldown modal** — copy-as-JSON, raw audit toggle, jump-to-audit-entry.
- **Rule-based fallback provider** — pour développement sans clé.

### 🛡️ Sentinel (risk veto)

- 5 règles de veto : daily loss limit, max position size, opposing signal, low confidence, blacklisted instrument.
- Veto results visibles dans ChainMonitor avec keybind `r` pour relancer.

### 💰 Trader (paper)

- PaperTrader avec slippage simulé, commission, fills atomiques.
- PositionManager : open / close / update mark / list / portfolio snapshot.
- Realized + unrealized PnL, gross + net exposure.

### 🎨 UI / UX

- **Dashboard** : split view watchlist / preview avec single-click focus + double-click drill.
- **17 screens** : Dashboard, Detail, Scanner, Alerts, Quality, Sources, Export, Journal, Correlation, Backtest, Corporate, VCFlow, Macro, ChainMonitor, Sentinel, Trader, Options.
- **Theme + density toggles** persistés (auto-reload).
- **Workspaces** : sauvegarder/restaurer thème + density combos nommés.
- **Audit filter** : persistant, action × confidence × veto-status × date range.
- **Decision drilldown** : modal complet avec copy-as-JSON, raw payload, audit jump.
- **Performance strip** : %change 1H/6H/1D/3D/7D inspiré TradingView.
- **Keybinds** : `r` = run chain, `1/5/q/h/4/d` = switch timeframe.
- **PAPER TRADING badge** : chip jaune always-on dans le TopBar. Disclaimer passif visible sur tous les screens — impossible de l'ignorer même en screenshot ou shoulder-surfing.

### 🏗️ Infrastructure

- Build Vite 8 + Rolldown — produit `dist/` clean en ~1-3s.
- 938 tests Vitest, fake-indexeddb pour le storage layer.
- Type-check `tsc -b` strict mode, `noUnusedLocals` + `noUnusedParameters`.
- ESLint avec react-hooks + react-refresh.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — lint → type-check → test → build sur push/PR. Concurrency cancellation pour ne pas empiler les runs sur les PRs.
- 5 packages internes (`shared-types`, `shared-utils`, `shared-signals`, `shared-clients`, `shared-infra`) + 2 apps (`sentinel`, `trader`).
- **README.md** — vrai overview projet (asset coverage, getting-started, scripts, architecture diagram, repo layout, status, disclaimer).

---

## 🟡 Ce qui marche partiellement (à finir avant production)

| Item | État | Prochaine étape |
|---|---|---|
| **AI providers** | Code OK, clés API non fournies | Ajouter `VITE_ANTHROPIC_API_KEY` + `VITE_XAI_API_KEY` dans `.env.local` |
| **Données macro (FRED)** | Mock provider seulement | Ajouter `VITE_FRED_API_KEY` ou brancher un autre provider |
| **Données corporate** | Mock provider seulement | Choisir provider (Finnhub ? Polygon ?) puis brancher |
| **Equities / forex live** | Mock seulement | Choisir broker (Alpaca / Polygon / OANDA) puis implémenter |
| **WebSocket sub-1h timeframes** | REST polling 60s TTL | Re-subscribe le kline WS sur changement de TF (jugé pas worth pour l'instant) |
| ~~**Backtest cross-instruments view**~~ | ✅ Shipped — recent-results chip strip dans Backtest | — |

---

## 🔴 Ce qui manque pour mise en service

### 🔐 Sécurité & secrets
- [ ] **Secrets manager** — actuellement les clés API vivent dans `.env.local` côté client (Vite expose tout VITE_*). Pour production il faut un backend qui détient les clés et signe les requêtes.
- [ ] **Rate limiting** côté serveur — Binance/Coinbase ont des quotas, un user agressif peut tout faire planter.
- [ ] **Input sanitization** — toutes les valeurs utilisateur passent en JSON dans des `style={{}}` et localStorage. Auditer pour XSS.

### 👥 Multi-utilisateur
- [ ] **Auth** — aucun système de login. Le pré-requis pour tout le reste.
- [ ] **Backend** — actuellement 100% client (IndexedDB local). Il faut un Postgres / Supabase pour partager des watchlists, stratégies, alertes entre utilisateurs.
- [ ] **Per-user data isolation** — les workspaces, alertes, audit logs sont en localStorage donc partagés entre tabs du même browser.

### 🚀 Déploiement
- [ ] **Hébergement** — pas de target choisie (Vercel / Cloudflare Pages / self-hosted ?). Le `dist/` est statique, n'importe quel CDN suffit.
- [ ] **Domaine + HTTPS** — à acheter + configurer.
- [x] ~~**CI**~~ ✅ `.github/workflows/ci.yml` — lint + type-check + test + build sur push/PR. Reste à câbler le **CD** (déploiement auto vers le host à choisir).
- [ ] **Monitoring / logs** — pas de Sentry / DataDog / OpenTelemetry. Si ça crashe en prod, on ne le sait pas.
- [ ] **Analytics** — pas de Plausible / PostHog. On ne sait pas qui utilise quoi.

### 📡 Données réelles equities/forex
- [ ] Choisir un broker pour AAPL / MSFT / NVDA / TSLA, EUR-USD / GBP-USD / USD-JPY. Candidats déjà esquissés dans `registry.ts` :
  - **Alpaca** (US equities) — gratuit, bon WS
  - **Polygon.io** (multi-asset) — payant mais propre
  - **OANDA** (forex) — gratuit avec compte demo
- [ ] Pour chaque broker choisi : implémenter `BaseProvider`, ajouter au `createRegistry()`, étendre `INSTRUMENTS` mapping.

### 💸 Trader réel (si applicable)
- [ ] **Décision business** : le Trader actuel est paper-only. Voulons-nous brancher de vraies exécutions ? Si oui :
  - Choisir broker exécution (Alpaca / Binance avec API key trading / Interactive Brokers).
  - Audit légal — qui assume le risque, qui paie les pertes, qui prélève les commissions ?
  - Compliance — KYC/AML si on opère pour des tiers.
- [ ] Sinon, **assumer paper-only** publiquement (badge "PAPER TRADING" partout).

### 📜 Légal & conformité
- [ ] **CGU / Privacy Policy** — obligatoires en EU (RGPD).
- [x] ~~**Disclaimer "PAPER TRADING"**~~ ✅ Badge always-on dans le TopBar (chip jaune).
- [x] ~~**Disclaimer "not financial advice"**~~ ✅ `NotFinancialAdviceBanner` mounted sur ChainMonitor / Trader / Sentinel avec context-string adapté à chaque écran.
- [ ] **Cookie consent** — si on ajoute analytics.
- [ ] **Clause exonératoire** — couvrir les pertes de l'utilisateur si Trader devient réel.

### 📚 Documentation utilisateur
- [x] ~~**README.md**~~ ✅ Refait — overview, asset coverage, getting-started, scripts, architecture ASCII, repo layout, disclaimer.
- [x] ~~**Quickstart**~~ ✅ Inclus dans README (`npm install` → `npm run dev` + section optional .env keys).
- [x] ~~**Architecture diagram**~~ ✅ ASCII dans README ("Architecture in 30 seconds").
- [x] ~~**Glossaire**~~ ✅ `GLOSSARY.md` — RSI, EMA, BB, DC, patterns, AI orchestrator, sentinel veto, backtest stats, providers, UI bits, lectures conseillées. En FR pour non-traders.

### 🧪 Tests manquants
- [ ] **E2E tests** — actuellement zero. Playwright ou Cypress pour valider les flows complets (run backtest → view on chart → markers visible).
- [ ] **Visual regression** — un Percy / Chromatic pour catcher les régressions UI.
- [ ] **Tests d'accessibilité** — axe-core en CI.
- [ ] **Performance budgets** — fixer un max-bundle-size en CI (TradingViewChart à 181 KB pourrait grossir).

### 🎯 Performance & scaling
- [x] ~~**Performance budgets**~~ ✅ `npm run check:budget` (CI step) — fail si un chunk dépasse son budget. Premier run a déjà attrapé une régression (NFA banner pulling lucide-react).
- [ ] **Code-splitting plus agressif** — `index.js` à 252 KB est OK mais pourrait baisser en différant `chain` / `audit`.
- [ ] **Service worker** — pour cache offline + PWA install.
- [ ] **Compression** — vérifier que le host sert en gzip/brotli (Cloudflare le fait par défaut).

---

## 🗓️ Roadmap suggérée pour mise en service

### Sprint 0 — décisions stratégiques (1 semaine)
- [ ] Décider : **paper trading public** OU **trading réel** ? (impacte tout le reste)
- [ ] Décider : **multi-utilisateur** ou **outil interne** ?
- [ ] Décider : **hébergement** (Vercel free tier suffit pour MVP)

### Sprint 1 — fondations production (2 semaines)
- [ ] README + quickstart documentation
- [ ] CI GitHub Actions : lint + type-check + test + build sur chaque PR
- [ ] Choisir et brancher 1 broker live equities (probablement Alpaca pour le free tier)
- [ ] Ajouter Sentry pour error tracking

### Sprint 2 — multi-utilisateur (3 semaines, **optionnel**)
- [ ] Backend Supabase (Postgres + Auth + Realtime)
- [ ] Migrer watchlists / strategies / audit logs vers backend
- [ ] Auth flow (Google + email)

### Sprint 3 — go-live
- [ ] CGU + Privacy Policy + disclaimer
- [ ] Domaine + DNS + HTTPS (Cloudflare)
- [ ] Smoke test E2E avec Playwright
- [ ] Ouverture publique 🎉

---

## 📊 Stats live du repo (snapshot 2026-04-26)

| Métrique | Valeur |
|---|---|
| Tests | **943 / 943 verts** |
| Test files | **95** |
| Type-check | ✅ clean |
| Build | ✅ clean (~1-3s) |
| Bundle principal | 252 KB (gz 80 KB) |
| Plus gros chunk | TradingViewChart 181 KB (gz 58 KB) |
| Branche actuelle | `ai-schemas-and-audit` |
| Commits cumulés sur 2 jours | **20+** features + docs, tout pushé, CI verte |

---

## 🤝 Comment lire cette checklist en équipe

1. **Vert (🟢)** = ne rien toucher, ça marche.
2. **Jaune (🟡)** = utilisable mais pas prêt prod — décider quoi en faire.
3. **Rouge (🔴)** = manquant. Pas grave si on assume "outil interne", bloquant si on vise le public.

Pour chaque ligne 🔴 que vous décidez d'attaquer, ouvrez une issue dans GitHub avec le label correspondant (`infra`, `security`, `data-source`, `legal`, `ux`). L'agent autonome (`/loop`) peut ensuite enchaîner sur le backlog.

> Cette checklist est régénérée à chaque session significative.
> Source de vérité ligne-par-ligne : `NOTES.md`.
