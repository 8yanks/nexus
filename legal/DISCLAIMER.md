# Disclaimer financier — NEXUS

> ⚠️ **PLACEHOLDER À FAIRE RELIRE PAR UN AVOCAT** spécialisé en droit
> financier (AMF en France, équivalents UE/US selon les juridictions
> ciblées). Ce texte est un brouillon de l'agent autonome.

---

## Résumé visible partout

> **NOT FINANCIAL ADVICE.** NEXUS est un outil d'analyse et de recherche.
> Aucune information affichée ne constitue un conseil en investissement,
> une recommandation d'achat ou de vente, ni une sollicitation à investir.
> Vous restez seul(e) responsable de vos décisions financières.

Ce texte est affiché en haut des écrans qui présentent des décisions
générées par l'IA (ChainMonitor, Sentinel, Trader). Voir aussi le badge
**PAPER TRADING** dans la barre supérieure : NEXUS n'exécute aucun ordre
réel sur les marchés financiers.

---

## Texte complet

### 1. Objet du service

NEXUS est un **outil d'analyse de marché et de génération de signaux**
basé sur des données de marché publiques et des modèles d'intelligence
artificielle. Il a vocation à aider les utilisateurs à structurer leur
analyse et à valider des hypothèses de stratégie via du backtesting
historique.

NEXUS **ne constitue pas** :
- un service de gestion de portefeuille,
- un service de conseil en investissement,
- un service de réception/transmission d'ordres,
- une plateforme d'exécution.

### 2. Statut réglementaire

À ce jour, NEXUS est diffusé comme **outil éducatif et de recherche**.
Il n'a pas le statut de PSI (Prestataire de Services d'Investissement),
ni de PSAN (Prestataire de Services sur Actifs Numériques), ni d'aucun
agrément AMF.

Les sorties affichées par l'application — signaux techniques, décisions
AI, backtests, alertes — sont **purement indicatives**.

### 3. Risques explicitement signalés

L'utilisation de NEXUS implique la reconnaissance des risques suivants :

#### 3.1 Risque de marché
Les marchés financiers (cryptomonnaies, actions, devises, indices,
matières premières) comportent des risques élevés de perte en capital,
parfois supérieurs au capital investi (dans le cas des produits dérivés
type futures avec effet de levier).

#### 3.2 Risque de modèle (IA)
Les décisions générées par les modèles d'IA tiers (Claude, Grok) :
- peuvent être incorrectes, biaisées ou hallucinées ;
- ne tiennent compte que des données fournies dans le contexte ;
- ne tiennent pas compte de votre situation personnelle (objectifs,
  horizon, tolérance au risque, capacité financière) ;
- ne remplacent en aucun cas un conseil personnalisé.

#### 3.3 Risque de backtest
Les résultats de backtest historiques :
- sont calculés sur des données passées qui **ne préjugent pas** des
  performances futures ;
- comportent des biais structurels (look-ahead, sur-ajustement,
  survivorship) qui surévaluent quasi systématiquement la performance ;
- n'incluent pas tous les frais, slippages et impacts marché réels ;
- ne reflètent pas le stress émotionnel d'un trading réel qui modifie
  le comportement de l'opérateur.

#### 3.4 Risque de données
Les données affichées proviennent de fournisseurs tiers (Binance,
Coinbase, Kraken, etc.) et sont fournies "en l'état" :
- elles peuvent être incorrectes, retardées ou indisponibles ;
- aucune garantie de fraîcheur ou d'exactitude n'est offerte ;
- la latence d'acheminement (provider → application → décision) peut
  rendre certains signaux techniquement valides mais pratiquement
  inactionnables.

#### 3.5 Risque technique
NEXUS est une application web. Elle peut subir des indisponibilités
temporaires, des bugs, des régressions, des pertes de données locales
sans préavis. Aucune SLA n'est offerte sur la disponibilité ou la
qualité des données.

### 4. Recommandations

Avant d'utiliser un signal, une décision IA ou un résultat de backtest
issu de NEXUS pour prendre une décision financière réelle :

1. **Validez** par votre propre analyse, indépendamment de l'outil.
2. **Consultez** un conseiller financier agréé pour toute décision
   d'investissement matérielle.
3. **Évaluez** votre situation personnelle (capacité à supporter une
   perte, horizon, objectifs).
4. **Limitez** votre exposition à un capital que vous pouvez vous
   permettre de perdre intégralement.
5. **Documentez** vos décisions et vos raisons — tenez votre propre
   journal indépendamment de l'audit interne de NEXUS.

### 5. Trading réel — limite d'usage

À la date de publication, NEXUS n'exécute **aucun ordre réel** sur les
marchés financiers. Le module "Trader" affiche des positions et des
ordres simulés (paper trading) à des fins de validation de stratégies
uniquement.

Si une fonctionnalité de trading réel est ajoutée à l'avenir :
- elle sera signalée par un changement explicite du badge "PAPER
  TRADING" en haut de l'application ;
- elle sera soumise à des conditions d'utilisation distinctes incluant
  une procédure de KYC/AML, des limites d'exposition, et une
  réaffirmation explicite du présent disclaimer ;
- elle nécessitera l'enregistrement réglementaire approprié de
  l'éditeur (PSAN/PSI selon les juridictions).

### 6. Décharge de responsabilité

Dans toute la mesure permise par la loi applicable :

- L'éditeur de NEXUS, ses employés, prestataires et partenaires ne
  sauraient être tenus responsables des pertes financières directes
  ou indirectes résultant de décisions prises sur la base des
  informations affichées par le service.
- Aucune garantie de résultat, de performance, de profit, ou de
  protection contre les pertes n'est offerte, ni explicitement, ni
  implicitement.
- L'utilisateur reconnaît avoir pris connaissance des présents
  avertissements et utiliser le service en pleine conscience des
  risques.

### 7. Juridictions à vérifier

Selon votre juridiction, l'utilisation d'outils d'aide à la décision
en matière de marchés financiers peut être soumise à des règles
spécifiques. Il vous appartient de vérifier la conformité de votre
usage de NEXUS avec la réglementation locale.

Particulièrement :
- **France / UE** : AMF, ACPR, RGPD, MiCA (cryptomonnaies)
- **États-Unis** : SEC, CFTC, FINRA
- **Royaume-Uni** : FCA
- **Suisse** : FINMA

---

> Ce disclaimer doit être affiché et accepté par l'utilisateur **avant
> tout usage du service** dès lors que NEXUS est mis en service publique
> (étape Sprint 3 de la roadmap dans READINESS.md). Tant que le service
> reste en usage interne (Sprint 0), l'affichage informatif via les
> badges existants suffit.
