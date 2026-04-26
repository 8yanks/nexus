# NEXUS — Performance audit

> Mesures et budgets perf de référence pour la mise en service.
> Les chiffres ci-dessous sont mis à jour à chaque session significative
> par l'agent autonome via `npm run check:budget`.

---

## 📦 Bundle sizes (production build)

| Chunk | Brute | gzip | Budget | Statut |
|---|---|---|---|---|
| **Entry (`index.js`)** | 238 KB | 76 KB | 280 KB | 🟢 ~85% |
| **TradingViewChart** | 181 KB | 58 KB | 200 KB | 🟢 ~91% |
| **shared helpers (NFA + audit)** | 32 KB | 11 KB | 40 KB | 🟢 ~80% |
| **ChainMonitor** | 31 KB | 8 KB | 40 KB | 🟢 ~78% |
| **registry** (providers) | 25 KB | 7 KB | 30 KB | 🟢 ~83% |
| **Backtest screen** | 23 KB | 7 KB | 30 KB | 🟢 ~77% |
| **analytics** (lazy) | 17 KB | 5 KB | 30 KB | 🟢 ~57% |
| **ai-orchestrator** (lazy) | 13 KB | 4 KB | 30 KB | 🟢 ~43% |
| **backtest-engine** (lazy) | 12 KB | 4 KB | 30 KB | 🟢 ~40% |
| Per-screen chunks | 2-15 KB | 1-5 KB | 30 KB | 🟢 |
| **Total transferred (first load)** | ~419 KB | ~134 KB | — | — |

> First load = entry + TradingViewChart + jsx-runtime (essentially everything
> parallel-fetched on app boot). Per-screen chunks load on first visit.

Run `npm run check:budget` to recompute. Budgets defined in
`scripts/check-bundle-budget.mjs` — bumping a budget should be
documented in the commit message.

## 🎯 Performance budgets (CI-enforced)

The bundle-size check runs in CI after every push and **fails the build**
if any chunk exceeds its budget. Catches:
- Accidental top-level imports of heavy libraries
- Eager imports that should be lazy
- Code-splitting regressions

## 🚀 Optimisations en place

| Technique | Impact |
|---|---|
| Lazy-loaded screens via `React.lazy()` | Chaque écran = un chunk dédié |
| `manualChunks` Vite (analytics, backtest, ai, audit) | Entry chunk -16 KB |
| Service worker stale-while-revalidate | Loads suivants instantanés + offline |
| PWA manifest (Add to Home Screen) | Installation native |
| TradingView lightweight-charts (vs Recharts) | -594 KB sur les charts |
| Inline SVG pour icônes critiques (NFA) | Évite un chunk lucide-react partagé |
| HTTP-cache via file-name hashing (Vite) | Aucun re-download si assets inchangés |

## ⚠️ Optimisations non encore en place

À considérer selon les mesures réelles en prod :

- [ ] **Brotli compression** côté serveur (Cloudflare/Vercel le font auto, mais à vérifier sur self-host).
- [ ] **HTTP/2 push** ou `<link rel=modulepreload>` pour les chunks critiques.
- [ ] **Image optimisation** — pour l'instant pas d'images, juste SVG. À surveiller si on ajoute des assets.
- [ ] **Code-splitting par signal-type** dans `signals/detector.ts` — diminuish returns, pas prio.
- [ ] **Tree-shaking lucide-react** — déjà fait via imports nommés, mais vérifier qu'aucun `import * as Icons` ne se cache.

## 📊 Comment mesurer en prod

Une fois le site déployé :

1. **Lighthouse CLI** :
   ```bash
   npx lighthouse https://your-domain.com --view
   ```
   Cible :
   - Performance: ≥ 90
   - Accessibility: ≥ 90 (a11y warnings actuellement à surveiller)
   - Best Practices: ≥ 95
   - SEO: ≥ 80

2. **Web Vitals** via le DevTools Performance panel :
   - LCP (Largest Contentful Paint) < 2.5s
   - FID (First Input Delay) < 100ms
   - CLS (Cumulative Layout Shift) < 0.1
   - INP (Interaction to Next Paint) < 200ms

3. **Network tab** :
   - Total transferred < 500 KB sur first load
   - Pas de requête > 1s sur 3G simulé

## 🔄 Reset / regen

À chaque ajout d'écran ou de dépendance :
1. `npm run build`
2. `npm run check:budget` — vérifie qu'aucun chunk n'a explosé
3. Mettre à jour la table en haut de ce doc avec les nouvelles tailles
4. Si une dépendance "mainstream" est ajoutée (recharts, framer-motion, date-fns, etc.) :
   - Vérifier l'impact sur le bundle
   - Considérer une alternative plus légère ou un dynamic import
