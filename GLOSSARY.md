# NEXUS — Glossaire

> Petit dictionnaire des termes qui reviennent dans l'app. Pour utilisateurs
> qui découvrent le trading systématique ou qui n'ont jamais touché un dashboard
> de marché. Tout est expliqué en français, sans jargon caché.

---

## 📊 Indicateurs techniques (les chiffres qui apparaissent à côté du prix)

### RSI — Relative Strength Index
Oscillateur qui mesure la **force récente** d'un mouvement de prix sur une fenêtre de 14 bougies.
Renvoie une valeur **entre 0 et 100**.
- **< 30** → "oversold" (survendu) — la baisse a été forte, un rebond peut venir.
- **> 70** → "overbought" (suracheté) — la hausse a été forte, une correction peut venir.
- Seuil bullish/bearish réel = à confirmer avec la structure.

### EMA — Exponential Moving Average
Moyenne mobile **pondérée** où les bougies récentes pèsent plus que les anciennes.
- **EMA 20** = moyenne courte → réagit vite au prix
- **EMA 50** = moyenne moyenne
- **EMA 200** = moyenne longue → tendance de fond
- **Golden cross** = EMA 20 passe au-dessus de l'EMA 50 → signal `EMA_CROSS_BULL`
- **Death cross** = EMA 20 passe sous l'EMA 50 → signal `EMA_CROSS_BEAR`

### ATR — Average True Range
Mesure de **volatilité absolue** sur 14 bougies. Donne l'amplitude moyenne d'une bougie en valeur du prix.
Sert à dimensionner stops + take-profits ("stop à 1.5 ATR sous l'entrée").

### VWAP — Volume Weighted Average Price
Prix moyen **pondéré par les volumes**. Pratique pour savoir si un trade est exécuté
au-dessus ou en-dessous du "centre de gravité" de la séance.

### Bollinger Bands (BB)
Trois lignes : moyenne 20 + bande supérieure (mean + 2σ) + bande inférieure (mean − 2σ).
- **BB Squeeze** = bandes très serrées (`bandwidth < 2%`) → volatilité comprimée, mouvement imminent.
- **BB Breakout Up** = prix casse la bande supérieure → momentum haussier.
- **BB Breakout Down** = prix casse la bande inférieure → momentum baissier.

### Donchian Channels (DC)
Trois lignes : plus haut N-bar + plus bas N-bar + leur moyenne. Période standard = 20 (méthode "Turtle").
- **DC Breakout Up** = prix casse le plus haut des 20 dernières bougies → breakout haussier.
- **DC Breakout Down** = prix casse le plus bas des 20 dernières bougies → breakout baissier.
- **DC Midline Cross Up/Down** = prix franchit la ligne médiane → hint de tendance précoce.

### Z-Score
"Combien d'écarts-types le prix actuel est-il loin de sa moyenne 20 bougies ?"
- **|z| > 2** = prix anormalement éloigné de sa moyenne → mean-reversion possible.

### Relative Volume (RVol)
Volume actuel comparé à la moyenne des 20 dernières bougies.
- **2.5×** = 250% du volume habituel → quelque chose se passe.
- Signal `HIGH_VOLUME` quand RVol > 2.5.

---

## 📈 Patterns chartistes (formes que le prix dessine)

| Pattern | Signal | Direction | Description courte |
|---|---|---|---|
| Double Top | `PATTERN_DOUBLE_TOP` | bearish | Deux sommets au même niveau, neckline cassée vers le bas |
| Double Bottom | `PATTERN_DOUBLE_BOTTOM` | bullish | Deux creux au même niveau, neckline cassée vers le haut |
| Head & Shoulders | `PATTERN_HEAD_SHOULDERS` | bearish | Trois sommets, celui du milieu plus haut. Reversal classique |
| Inverse H&S | `PATTERN_INV_HEAD_SHOULDERS` | bullish | Miroir vers le bas du H&S |
| Ascending Triangle | `PATTERN_ASCENDING_TRIANGLE` | bullish | Toit horizontal, plancher montant. Breakout haussier attendu |
| Descending Triangle | `PATTERN_DESCENDING_TRIANGLE` | bearish | Plancher horizontal, toit descendant. Breakout baissier attendu |

**Confidence ≥ 0.6 requise** pour qu'un pattern devienne un signal actionnable
(seuil `PATTERN_MIN_CONFIDENCE`).

---

## 🧱 Concepts de structure de marché

### Higher Highs / Higher Lows (HH/HL)
La définition technique d'une **tendance haussière** : chaque sommet est plus haut que le précédent
ET chaque creux est plus haut que le précédent. Inverse pour bearish.

### Range / Sideways
Le prix oscille entre un support et une résistance sans direction nette.
Signal `STRUCT_BULL` / `STRUCT_BEAR` reste silencieux.

### Volatility regime
Détecté à partir du z-score de l'ATR :
- **Compression** → ATR anormalement bas → mouvement explosif possible
- **Normal** → conditions habituelles
- **Expansion** → ATR anormalement haut → suite du move OU épuisement

---

## 🤖 Pipeline de décision

### Signal
Événement détecté par la couche analytics. Type + direction + force (0-1) + description.
Exemples : `RSI_OVERSOLD`, `BB_BREAKOUT_UP`, `PATTERN_HEAD_SHOULDERS`.

### AI Orchestrator
Couche qui prend le contexte (snapshots + signals + analytics) et appelle un ou plusieurs
modèles AI (Claude, Grok). Renvoie une **TradeDecision** typée :
`{action: BUY|SELL|HOLD, symbol, confidence, riskLevel, horizon, ...}`.

### Consensus
Quand plusieurs providers AI sont actifs (Claude + Grok), on agrège leurs réponses :
- **Action** = vote majoritaire
- **Confidence** = moyenne pondérée

### Sentinel veto
5 règles de risk-management qui peuvent **bloquer** une décision AI avant exécution :
1. Daily loss limit dépassée
2. Position size trop grande
3. Signal opposé à une position ouverte
4. Confidence trop basse
5. Instrument blacklisté

Si une règle déclenche, la décision est **vetoed** et n'est jamais routée vers le trader.

### Trader (paper)
Exécute les décisions qui passent le Sentinel. **Aucun broker réel n'est branché** —
tous les fills sont simulés avec slippage configurable et commission. Voir le badge
**PAPER TRADING** en haut à droite de chaque écran.

### Audit log
Chaque décision (acceptée, rejetée par schema, vetoed par Sentinel) est tracée avec :
- Le **hash de contexte** (prouve sur quoi l'AI s'est basée)
- Le **raw payload** AI (avant validation)
- Les **veto reasons** s'il y en a
- Les **orders** générés s'il y en a

Drilldown disponible depuis chaque ligne de l'historique.

---

## 📈 Backtesting

### BacktestConfig
Paramètres d'un backtest : instrument, signaux d'entrée, stop-loss, take-profit,
trailing stop, max bars, capital initial, position size, commission.

### Win Rate
Fraction des trades clôturés en profit. **0.6 = 60%**.

### Profit Factor
`grossProfit / |grossLoss|`. Au-dessus de 1.5 c'est bon, au-dessus de 2 c'est excellent.
∞ quand il n'y a aucun trade perdant.

### Sharpe Ratio
Rendement par unité de volatilité. Au-dessus de 1 = stratégie viable, au-dessus de 2 = très bon.
Au-dessus de 3 = soit excellent, soit overfit (à valider out-of-sample).

### Max Drawdown
La perte maximale subie depuis le pic d'équité, en fraction du capital. **0.2 = 20% drawdown**.
C'est le chiffre qui fait abandonner les vraies stratégies — un Sharpe 3 avec 50% drawdown
est inutilisable en pratique.

### Expectancy
PnL moyen par trade. `(winRate × avgWin) - ((1 − winRate) × avgLoss)`. Doit être > 0
pour qu'une stratégie soit viable.

### MFE / MAE
**Max Favorable Excursion** = meilleur prix atteint pendant un trade (avant clôture).
**Max Adverse Excursion** = pire prix atteint. Sert à calibrer les stops/TP.

---

## 🔌 Providers de données

### Live providers
- **Binance Spot** — REST seed + WebSocket ticker + kline 1h. Pas de clé requise.
- **Binance Futures** — Idem + funding rate + open interest + book ticker.
- **Coinbase Exchange** — REST seed + WS ticker. Pas de clé requise.
- **Kraken** — REST polling seulement (1 req/sec safe). Pas de clé requise.

### Mock provider
Génère des candles plausibles pour tout instrument sans live source.
**Marqué `_status: SIMULATED`** — toujours visible dans l'audit trail.

### Provider chain
Pour chaque instrument, l'ordre de fallback :
`binance → coinbase → kraken → mock`. Chaque maillon est gated par son `*Connected` flag.
Un Binance offline ne bloque pas Coinbase et vice-versa.

### Multi-timeframe
Picker `1m / 5m / 15m / 1h / 4h / 1d` sur le Detail. Le **1h est WS-tracked** (live),
les autres TFs utilisent un **cache REST avec TTL 60s** pour ne pas hammer l'endpoint.

---

## 🎛️ UI / UX

### Workspaces
Combos sauvegardés de **theme + density**. Pour basculer rapidement entre une vue
"day-trading dense" et une vue "research light".

### Audit filter
Filtre persistant sur la page Journal : action × confidence × veto-status × date range.
Préférence stockée dans `localStorage`.

### Live-tick indicator
Pulse vert/jaune/rouge en haut à droite de chaque chart. Indique si **les données
arrivent vraiment** (vert < 10s, jaune < 60s, rouge au-delà).

### Hotkeys
- **r** — re-run la chain de décision
- **1 / 5 / q / h / 4 / d** — changer le timeframe sur Detail
- **Esc** — fermer modal / retour Dashboard

---

## 🧪 Lectures conseillées

- **John Murphy — *Technical Analysis of the Financial Markets*** : la bible des indicateurs
  classiques (RSI, MACD, Bollinger).
- **Curtis Faith — *Way of the Turtle*** : la méthode Donchian breakout originale.
- **Aronson — *Evidence-Based Technical Analysis*** : pour comprendre pourquoi
  beaucoup de signaux échouent en backtest out-of-sample.

---

> Manque un terme ? Ouvre une issue avec `glossary` en label.
