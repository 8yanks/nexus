import { useState } from 'react'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import { NotFinancialAdviceBanner } from '@/ui/components/NotFinancialAdviceBanner'
import { colors, fonts, card } from '@/ui/theme'

// ─── LEGAL SCREEN ───────────────────────────────────────────
//
// Surface for the placeholder legal docs in `legal/*.md`. Three tabs
// (Disclaimer / Terms / Privacy) so users can find each section. The
// content lives inline rather than fetched at runtime — the docs are
// small, change rarely, and we don't want to depend on a markdown
// renderer dep just for this screen. When the docs are
// lawyer-validated (cf. legal/README.md workflow), update the strings
// here in the same PR.
//
// Each section opens with a clear "PLACEHOLDER" notice so users +
// auditors know the content isn't yet legally binding. Once
// finalised, swap that notice for the publication date.

type Tab = 'disclaimer' | 'terms' | 'privacy'

const TABS: { id: Tab; label: string }[] = [
  { id: 'disclaimer', label: 'Disclaimer' },
  { id: 'terms', label: 'Conditions Générales' },
  { id: 'privacy', label: 'Confidentialité' },
]

const PLACEHOLDER_NOTICE =
  'Ce document est un BROUILLON rédigé par l\'agent autonome. Il doit être validé par un avocat avant toute mise en service publique. Voir legal/README.md pour le workflow.'

const DISCLAIMER_BODY = `
NEXUS est un outil d'analyse de marché et de génération de signaux basé sur des données de marché publiques et des modèles d'intelligence artificielle. Il a vocation à aider les utilisateurs à structurer leur analyse et à valider des hypothèses de stratégie via du backtesting historique.

NEXUS NE CONSTITUE PAS :
• un service de gestion de portefeuille
• un service de conseil en investissement
• un service de réception/transmission d'ordres
• une plateforme d'exécution

Risques explicitement signalés :

1. RISQUE DE MARCHÉ — Les marchés financiers comportent des risques élevés de perte en capital, parfois supérieurs au capital investi (produits dérivés type futures avec effet de levier).

2. RISQUE DE MODÈLE (IA) — Les décisions générées par les modèles d'IA tiers (Claude, Grok) peuvent être incorrectes, biaisées ou hallucinées. Elles ne tiennent pas compte de votre situation personnelle.

3. RISQUE DE BACKTEST — Les résultats historiques sont calculés sur des données passées qui ne préjugent pas des performances futures. Biais structurels (look-ahead, sur-ajustement, survivorship) qui surévaluent quasi systématiquement la performance.

4. RISQUE DE DONNÉES — Les données affichées proviennent de fournisseurs tiers (Binance, Coinbase, Kraken) et sont fournies "en l'état". Aucune garantie de fraîcheur ou d'exactitude.

5. RISQUE TECHNIQUE — NEXUS peut subir des indisponibilités temporaires, des bugs, des régressions, des pertes de données locales sans préavis.

Recommandations :
• Validez chaque signal par votre propre analyse, indépendamment de l'outil.
• Consultez un conseiller financier agréé pour toute décision d'investissement matérielle.
• Limitez votre exposition à un capital que vous pouvez vous permettre de perdre intégralement.
• Tenez votre propre journal de décisions, indépendamment de l'audit interne de NEXUS.

À ce jour, NEXUS n'exécute aucun ordre réel sur les marchés financiers. Le module "Trader" affiche des positions et des ordres simulés (paper trading) à des fins de validation de stratégies uniquement.

Le texte complet est disponible dans le fichier legal/DISCLAIMER.md du repository.
`.trim()

const TERMS_BODY = `
1. OBJET — NEXUS est un outil de monitoring multi-actifs et d'aide à la décision basé sur des données de marché publiques et des modèles d'IA. Il a vocation à fournir une vue agrégée et analytique sur les mouvements de marchés financiers.

2. ACCEPTATION — L'utilisation de NEXUS implique l'acceptation pleine et entière des présentes CGU.

3. AVERTISSEMENT — NEXUS ne constitue en aucun cas un conseil en investissement. Les marchés financiers comportent des risques significatifs de perte en capital. Voir l'onglet Disclaimer pour le détail des risques.

4. DONNÉES UTILISÉES — NEXUS agrège des données publiques de Binance, Coinbase Exchange, Kraken (et providers à venir). Données fournies "en l'état" par leurs émetteurs respectifs.

5. LIMITATION DE RESPONSABILITÉ — Dans toute la mesure permise par la loi, l'éditeur ne saurait être tenu pour responsable :
• des pertes financières directes ou indirectes
• des défaillances temporaires de l'application
• des décisions prises par les modèles d'IA tiers
• des actions des fournisseurs de données tiers

6. PROPRIÉTÉ INTELLECTUELLE — Le code source de NEXUS, ses interfaces, ses analytics et sa documentation sont la propriété de leurs auteurs.

7. DONNÉES PERSONNELLES — Voir l'onglet Confidentialité.

8. MODIFICATION — Les présentes CGU peuvent être modifiées à tout moment.

9. DROIT APPLICABLE — Droit français.

Le texte complet est disponible dans le fichier legal/TERMS.md du repository.
`.trim()

const PRIVACY_BODY = `
1. RESPONSABLE DU TRAITEMENT — À compléter au moment de la publication.

2. DONNÉES TRAITÉES LOCALEMENT — NEXUS fonctionne en grande partie côté client. Les données suivantes sont stockées dans votre navigateur (localStorage + IndexedDB) et NE SONT JAMAIS TRANSMISES à nos serveurs :
• Préférences UI (thème, densité, écran courant, instrument focusé, workspace, toggles overlays, timeframe)
• Historique local des snapshots de marché (pruned auto après 7 jours)
• Historique local des signaux détectés (pruned après 30 jours)
• Configuration et résultats de backtest

Vous pouvez à tout moment vider ces données via les outils du navigateur sans affecter le fonctionnement futur.

3. DONNÉES TRANSMISES À DES TIERS — NEXUS communique avec :
• Binance (api.binance.com, fapi.binance.com, stream.binance.com) — aucune authentification, requêtes publiques
• Coinbase Exchange — aucune authentification
• Kraken — aucune authentification
• Google Fonts — User-Agent + IP pour les polices Inter et JetBrains Mono
• Anthropic API (si VITE_ANTHROPIC_API_KEY configurée) — snapshot + clé utilisateur
• xAI API (si VITE_XAI_API_KEY configurée) — snapshot + clé utilisateur

Aucune de ces requêtes ne contient d'identifiant utilisateur que nous contrôlons.

4. DONNÉES SERVEUR — À ce jour, AUCUNE. NEXUS est servi en assets statiques.

5. BASE LÉGALE (RGPD) — Intérêt légitime pour le fonctionnement technique. Consentement le cas échéant pour analytics.

6. VOS DROITS RGPD — Accès via les outils Développeur du navigateur. Effacement via outils du navigateur. Portabilité via la fonction Export CSV du Backtest. Opposition via non-utilisation du service.

7. COOKIES — À ce jour, NEXUS n'utilise aucun cookie ni traceur de marketing/publicité/analytics. Une bannière de consentement sera ajoutée si une telle fonctionnalité est implémentée.

8. SÉCURITÉ — HTTPS obligatoire. Données locales protégées par la sandbox per-origin du navigateur.

Le texte complet est disponible dans le fichier legal/PRIVACY.md du repository.
`.trim()

const BODIES: Record<Tab, string> = {
  disclaimer: DISCLAIMER_BODY,
  terms: TERMS_BODY,
  privacy: PRIVACY_BODY,
}

export const Legal = () => {
  const [tab, setTab] = useState<Tab>('disclaimer')

  return (
    <>
      <ScreenHeader
        title="Documents Légaux"
        subtitle="CGU, Politique de confidentialité, Disclaimer financier — brouillons à valider par avocat avant publication."
      />
      <NotFinancialAdviceBanner context="Cette page contient des extraits — la version pleine est dans legal/*.md du repo." />
      <div style={{ padding: '14px 20px' }}>
        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Section légale"
          style={{ display: 'flex', gap: 4, marginBottom: 12 }}
          data-testid="legal-tabs"
        >
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`legal-panel-${t.id}`}
                id={`legal-tab-${t.id}`}
                data-testid={`legal-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontFamily: fonts.sans,
                  border: `1px solid ${active ? colors.accent : colors.border}`,
                  borderRadius: 4,
                  background: active ? `${colors.accent}20` : 'transparent',
                  color: active ? colors.accent : colors.textMuted,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Active panel */}
        <div
          role="tabpanel"
          id={`legal-panel-${tab}`}
          aria-labelledby={`legal-tab-${tab}`}
          data-testid={`legal-panel-${tab}`}
          style={{ ...card, padding: 20 }}
        >
          {/* Placeholder banner — yellow strip at the top of every tab. */}
          <div
            style={{
              padding: '8px 12px',
              marginBottom: 16,
              background: `${colors.yellow}10`,
              border: `1px solid ${colors.yellow}40`,
              borderRadius: 4,
              fontSize: 11,
              fontFamily: fonts.sans,
              color: colors.textSecondary,
              lineHeight: 1.5,
            }}
            data-testid="legal-placeholder-notice"
          >
            <strong style={{ color: colors.yellow, letterSpacing: '0.02em' }}>
              BROUILLON — NON OPPOSABLE
            </strong>
            <br />
            {PLACEHOLDER_NOTICE}
          </div>

          {/* Body — pre with whitespace preserved so paragraph + bullet
              spacing reads cleanly without a markdown renderer. */}
          <pre
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              lineHeight: 1.7,
              color: colors.text,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {BODIES[tab]}
          </pre>
        </div>
      </div>
    </>
  )
}
