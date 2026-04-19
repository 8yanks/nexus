# Session notes

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
