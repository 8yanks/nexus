# NEXUS — Hosting & Deployment Options

> Décision à prendre **avant le sprint 1** de la roadmap dans `READINESS.md`.
> Toutes les options ci-dessous fonctionnent — il faut choisir laquelle correspond au stade actuel
> (interne / privé / public) et à votre tolérance ops.

L'app est **100 % statique** (pas de backend custom dans la version actuelle), donc n'importe quel
host de fichiers statiques + CDN suffit. Voilà les options classées par effort vs. contrôle.

---

## 🥇 Option 1 — Vercel (recommandé pour MVP)

**Pour qui :** vous voulez quelque chose qui marche en 10 minutes, vous avez un compte GitHub.

**Effort :** 🟢 minimal. Connecte le repo, click deploy, c'est en ligne.

**Coût :** Gratuit pour usage perso (Hobby plan, 100 GB bandwidth/mois). $20/mois si vous passez sur Pro.

**Avantages :**
- CI/CD automatique sur chaque push (pas besoin de configurer le CD côté GitHub Actions).
- Preview deployments par PR — le code review se fait sur une vraie URL.
- HTTPS auto, domaine custom gratuit.
- Compression Brotli + edge caching out-of-the-box.
- Analytics web vitals incluses.

**Inconvénients :**
- Vendor lock-in modéré (le `vercel.json` est spécifique).
- Le free tier limite à 100 déploiements/jour.

**Setup :**
```bash
# Une fois, depuis le repo
npx vercel
# Répondre aux questions, lier le projet GitHub
# Push suivant déclenche automatiquement un build + deploy
```

`vercel.json` à la racine (optionnel, pour fine-tune le rewrite SPA) :
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 🥈 Option 2 — Cloudflare Pages

**Pour qui :** vous voulez plus de contrôle bas-niveau, vous comptez utiliser Workers/D1 plus tard.

**Effort :** 🟢 minimal. Similaire à Vercel — connecter le repo, set la build command.

**Coût :** Gratuit, **bandwidth illimité** (vraiment illimité). C'est l'arme nucléaire pour un projet
qui pourrait scaler.

**Avantages :**
- Bandwidth illimité même sur free tier.
- Réseau edge plus dense que Vercel (300+ POPs).
- Préparation parfaite pour ajouter des Workers (auth, API proxy) plus tard sans changer de host.
- Compression Brotli incluse, HTTP/3.

**Inconvénients :**
- Console plus austère que Vercel.
- Preview deployments par branche, pas par commit comme Vercel.

**Setup :**
- Aller sur dash.cloudflare.com → Pages → Create
- Connecter le repo GitHub
- Build command: `npm run build`
- Build output: `dist`
- Environment variables: ajouter les `VITE_*` keys si nécessaires

---

## 🥉 Option 3 — Netlify

**Pour qui :** vous avez déjà un compte, vous aimez leurs extensions.

**Effort :** 🟢 minimal.

**Coût :** Gratuit avec 100 GB/mois bandwidth, 300 build minutes/mois. $19/mois pour Pro.

**Avantages :**
- Forms / Functions intégrées si vous avez besoin d'un peu de backend serverless.
- Identity (auth) intégrée pour MVP multi-utilisateur.
- Plugin écosystème solide.

**Inconvénients :**
- Build minutes plafonnés peuvent gêner sur un repo actif.
- Bandwidth payant au-dessus de 100 GB.

---

## 🛠 Option 4 — VPS self-hosted (Hetzner / OVH / DigitalOcean)

**Pour qui :** vous voulez **tout maîtriser** (parce que future backend, données sensibles, conformité).

**Effort :** 🔴 élevé. Vous gérez : OS updates, certificats Let's Encrypt, nginx config, monitoring,
backups, scaling.

**Coût :** À partir de **~5 €/mois** (Hetzner CX11). Bandwidth quasi illimité.

**Setup minimal (Ubuntu 22.04 + nginx) :**
```bash
# Sur le serveur
apt update && apt install nginx certbot python3-certbot-nginx
# Pousser le contenu du dist/ via rsync depuis local
rsync -avz dist/ user@server:/var/www/nexus/
# Config nginx + cert
certbot --nginx -d nexus.your-domain.com
```

`nginx.conf` SPA (à mettre dans `/etc/nginx/sites-available/nexus`) :
```nginx
server {
    listen 443 ssl http2;
    server_name nexus.your-domain.com;
    root /var/www/nexus;
    index index.html;
    # SPA rewrite — toute route inconnue retourne index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    # Compression
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    # Cache assets (file names ont déjà un hash, donc safe long cache)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Avantages :**
- Contrôle total (logs, certificats, custom headers).
- Données utilisateurs (si on en gère plus tard) restent chez vous.
- Pas de vendor lock-in.

**Inconvénients :**
- Ops réelle requise — quelqu'un doit savoir débugger nginx à 2h du matin.
- HTTPS / cert renewals à monitorer.

---

## 🌐 Option 5 — GitHub Pages

**Pour qui :** vous voulez ZERO friction et acceptez que ce soit publiquement visible.

**Effort :** 🟢 minimal.

**Coût :** Gratuit, public uniquement (pour repos publics).

**Avantages :**
- Pas de compte tier à créer — déjà branché sur le repo.
- HTTPS auto.

**Inconvénients :**
- Pas de domaine custom HTTPS sans CNAME wizard.
- Pas de preview deployments.
- Limites de bandwidth peu claires.
- Repo doit rester public (sauf si vous payez GitHub Pro).

**Setup (.github/workflows/deploy.yml) :**
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```

Aller dans **repo Settings → Pages → Source: GitHub Actions**.

---

## 🎯 Recommandation

**Pour le MVP interne (vous + associé)** : **Vercel** ou **Cloudflare Pages**.
- Vercel si vous voulez les preview deployments par PR pour le code review.
- Cloudflare Pages si vous prévoyez d'ajouter Workers/D1 plus tard.

**Pour passer en public avec utilisateurs réels** : **Cloudflare Pages** + un domaine custom à 12 €/an.

**Pour 100 % contrôle (data sensibles, futur backend, compliance)** : **VPS Hetzner** + nginx.
Demande quelqu'un côté équipe qui sache faire les ops.

---

## 📋 Avant de déployer (checklist)

- [ ] Décider si on shippe `paper trading` only (texte du badge actuel) ou si on prévoit du
  `live trading` (auquel cas, voir la section "Trader réel" de READINESS.md — décisions
  business + légales).
- [ ] Définir le domaine final (ex: `nexus.app`, `nexus.io`, `nexus-trading.com`).
- [ ] Acheter le domaine si pas déjà fait (Cloudflare Registrar = prix coûtant, pas de markup).
- [ ] Décider quelles `VITE_*` keys vivent en prod et lesquelles restent dev-only.
  Rappel : tout `VITE_*` est exposé côté client — **jamais de clé qui peut faire du write**
  côté broker / AI provider sans rate limit.
- [ ] Configurer un Sentry (ou équivalent) pour l'error tracking en prod.
- [ ] Ajouter un cookie consent banner si vous activez Plausible/PostHog/GA.
- [ ] Vérifier que les CGU + Privacy Policy + disclaimer "not financial advice"
  sont en place côté UI (badge `PAPER TRADING` + banner sur ChainMonitor / Trader / Sentinel
  déjà shippés, mais le texte légal complet reste à rédiger par un humain).

---

> Cette doc est un point de départ. Toutes les commandes ont été testées sur Linux/macOS —
> sur Windows il faudra adapter (PowerShell + WSL conseillé).
