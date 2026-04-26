# Politique de Confidentialité — NEXUS

> ⚠️ **PLACEHOLDER À FAIRE RELIRE PAR UN AVOCAT.** Ce texte est un brouillon
> rédigé par l'agent autonome pour servir de base de discussion. Avant mise en
> service publique en UE, faire valider la conformité RGPD par un DPO ou un
> avocat spécialisé en données personnelles.

**Dernière mise à jour : à compléter au moment de la publication.**

---

## 1. Responsable du traitement

*(À compléter au moment de la publication.)*

Identité : *raison sociale de l'éditeur*
Adresse : *adresse postale*
Email : *adresse de contact RGPD*

## 2. Données collectées

### 2.1 Données traitées **localement** dans votre navigateur

NEXUS fonctionne en grande partie côté client. Les données suivantes sont
stockées dans votre navigateur (`localStorage` + `IndexedDB`) et **ne sont
jamais transmises à nos serveurs** :

- Préférences UI (thème, densité, écran courant, instrument focusé,
  workspace actif, toggles d'overlays graphiques, timeframe sélectionné)
- Historique local des snapshots de marché (pruned automatiquement après
  7 jours)
- Historique local des signaux détectés (pruned après 30 jours)
- Configuration de backtest la plus récente
- Résultats de backtest pour la session en cours
- Audit trail local des décisions AI

Vous pouvez à tout moment vider ces données via les outils du navigateur
("Effacer les données du site") sans affecter le fonctionnement futur de
NEXUS — l'app se réinitialisera aux paramètres par défaut.

### 2.2 Données transmises à des **tiers**

NEXUS communique avec les services tiers suivants pour récupérer les
données de marché :

| Service | Données envoyées | Finalité |
|---|---|---|
| **Binance** (api.binance.com, fapi.binance.com, stream.binance.com) | Aucune authentification — requêtes publiques | Récupération des prix Spot + Futures |
| **Coinbase Exchange** (api.exchange.coinbase.com, ws-feed.exchange.coinbase.com) | Aucune authentification | Récupération des prix Spot |
| **Kraken** (api.kraken.com) | Aucune authentification | Récupération des prix Spot (fallback) |
| **Google Fonts** (fonts.googleapis.com, fonts.gstatic.com) | User-Agent + IP | Chargement des polices Inter et JetBrains Mono |
| **Anthropic API** (api.anthropic.com) — *si VITE_ANTHROPIC_API_KEY configurée* | Snapshot de marché courant + clé API utilisateur | Génération de décisions AI par Claude |
| **xAI API** (api.x.ai) — *si VITE_XAI_API_KEY configurée* | Snapshot de marché courant + clé API utilisateur | Génération de décisions AI par Grok |

**Aucune de ces requêtes ne contient d'identifiant utilisateur que nous
contrôlons.** Nous ne créons pas de compte, pas de session serveur,
pas de cookie de tracking.

### 2.3 Données collectées par notre serveur

À ce jour, **aucune**. NEXUS est servi en assets statiques (HTML / CSS /
JS) depuis un CDN. Le serveur d'hébergement peut techniquement journaliser
votre adresse IP et User-Agent à des fins opérationnelles standard
(prévention d'abus, analytics agrégées). Voir la section "Hébergeur".

## 3. Hébergeur

*(À compléter selon le choix d'hébergement final — voir HOSTING.md.)*

Hébergeur retenu : *Vercel / Cloudflare Pages / VPS Hetzner / autre*
Localisation des serveurs : *région*
Politique de logs : *durée de conservation, finalités*

## 4. Base légale (RGPD)

Pour les utilisateurs en Union Européenne, les bases légales applicables
sont :

- **Intérêt légitime** : fonctionnement technique de l'application
  (stockage local, requêtes vers les providers de données publiques).
- **Consentement** : le cas échéant, pour des analytics ou cookies
  non-essentiels (non implémentés à ce jour, voir aussi cookie consent
  banner si activé).

## 5. Durée de conservation

| Type de donnée | Durée | Lieu |
|---|---|---|
| Préférences UI | jusqu'à effacement manuel | localStorage navigateur |
| Snapshots de marché | 7 jours (auto-pruned) | IndexedDB navigateur |
| Signaux détectés | 30 jours (auto-pruned) | IndexedDB navigateur |
| Config + résultats backtest | jusqu'à effacement manuel | localStorage / mémoire |

## 6. Vos droits (RGPD)

Conformément au RGPD, vous disposez des droits suivants :

- **Droit d'accès** : étant donné que les données restent dans votre
  navigateur, vous y accédez via les outils Développeur (Application →
  Local Storage / IndexedDB).
- **Droit de rectification** et **droit à l'effacement** : effacement via
  les outils du navigateur ou via la fonction "Reset" présente sur les
  écrans concernés.
- **Droit à la portabilité** : la fonction "Export CSV" du Backtest
  permet de récupérer vos données générées au format ouvert.
- **Droit d'opposition** : ne pas utiliser le service.

Pour les données éventuellement collectées par notre hébergeur (logs
serveur), adresser une demande à *(adresse de contact)*.

## 7. Cookies et traceurs

À ce jour, **NEXUS n'utilise aucun cookie ni traceur de marketing,
publicité ou analytics**.

Si une telle fonctionnalité est ajoutée à l'avenir (analytics auto-hébergées
type Plausible, monitoring d'erreurs type Sentry), un bandeau de
consentement sera ajouté en parallèle.

## 8. Sécurité

Les données stockées localement bénéficient des protections du navigateur
(sandbox per-origin, isolation cross-site). Elles ne sont accessibles que
sur l'appareil et le profil navigateur où elles ont été créées.

NEXUS est servi exclusivement en HTTPS. Les requêtes vers les API tierces
utilisent TLS 1.2+.

## 9. Modification de la politique

Cette politique peut être mise à jour. La version en vigueur est celle
accessible dans l'application au moment de l'utilisation. Les changements
matériels seront annoncés via une bannière en haut de l'app.

## 10. Contact

Pour toute question relative au traitement de vos données :
*(à compléter avec une adresse de contact valide)*

Pour saisir l'autorité de contrôle (CNIL en France) :
https://www.cnil.fr/fr/plaintes
