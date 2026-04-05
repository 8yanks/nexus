import type { VCDeal, VCDataProvider, VCDealType, VCSector, VCGeo } from './types'

// ─── MOCK VC DEAL DATA ──────────────────────────────────────
// Realistic startup funding rounds. All SIMULATED status.

let _dealId = 0
const mkId = (): string => `vc_${++_dealId}`

const mkDeal = (
  companyName: string,
  dealType: VCDealType,
  amount: number | null,
  valuation: number | null,
  sector: VCSector,
  geo: VCGeo,
  investors: string[],
  headline: string,
  summary: string,
  relatedTickers: string[],
  hoursAgo: number,
): VCDeal => ({
  id: mkId(),
  companyName,
  dealType,
  amount,
  valuation,
  sector,
  geo,
  investors,
  headline,
  summary,
  relatedTickers,
  timestamp: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
  _source: 'mock_vc',
  _status: 'SIMULATED',
  _provenance: { source: 'mock_vc', fetchMethod: 'generated', latencyMs: 0 },
})

const MOCK_DEALS: VCDeal[] = [
  mkDeal('Nexara AI', 'SERIES_B', 120_000_000, 800_000_000, 'AI_ML', 'US',
    ['a16z', 'Sequoia Capital'],
    'Nexara AI Raises $120M Series B for Enterprise AI Agents',
    'Nexara builds autonomous AI agents for enterprise workflow automation. Revenue grew 4x YoY.',
    ['nvda', 'msft'], 4),

  mkDeal('CyberVault', 'SERIES_C', 200_000_000, 1_500_000_000, 'CYBERSECURITY', 'US',
    ['Accel', 'Lightspeed'],
    'CyberVault Hits Unicorn Status with $200M Series C',
    'Zero-trust security platform for cloud-native enterprises. 500+ enterprise customers.',
    [], 8),

  mkDeal('GreenFlux Energy', 'SERIES_A', 45_000_000, 180_000_000, 'CLIMATE', 'EU',
    ['Breakthrough Energy Ventures', 'EQT Ventures'],
    'GreenFlux Raises $45M to Scale Grid Battery Storage',
    'Novel battery chemistry enables 4x energy density for grid-scale storage applications.',
    [], 16),

  mkDeal('Orbital Dynamics', 'SERIES_B', 80_000_000, 500_000_000, 'SPACE', 'US',
    ['Founders Fund', 'Lux Capital'],
    'Orbital Dynamics Secures $80M for Satellite Constellation',
    'Building next-gen LEO communications network with 60% lower latency than competitors.',
    [], 24),

  mkDeal('FinStack', 'SEED', 12_000_000, null, 'FINTECH', 'UK',
    ['Y Combinator', 'Index Ventures'],
    'FinStack Raises $12M Seed for Embedded Finance APIs',
    'Ex-Stripe team building modular banking-as-a-service platform for European fintechs.',
    [], 30),

  mkDeal('BioNova Therapeutics', 'SERIES_D_PLUS', 350_000_000, 2_200_000_000, 'BIOTECH', 'US',
    ['ARCH Venture Partners', 'Flagship Pioneering'],
    'BioNova Raises $350M Ahead of Phase 3 Trials',
    'mRNA-based cancer immunotherapy showing 68% overall response rate in Phase 2.',
    [], 36),

  mkDeal('DevForge', 'SERIES_A', 28_000_000, 140_000_000, 'DEVTOOLS', 'US',
    ['Greylock Partners', 'Redpoint Ventures'],
    'DevForge Raises $28M for AI-Powered Code Review',
    'Automated code review platform reduces PR review time by 70%. 2,000+ teams.',
    ['msft'], 48),

  mkDeal('RoboSense', 'SERIES_C', 150_000_000, 900_000_000, 'ROBOTICS', 'ASIA',
    ['SoftBank Vision Fund', 'Tiger Global'],
    'RoboSense Raises $150M for Warehouse Automation',
    'Mobile manipulation robots for warehouse logistics. Deployed in 40 Amazon fulfillment centers.',
    [], 60),

  mkDeal('ChainBase', 'SERIES_B', 65_000_000, 400_000_000, 'CRYPTO_WEB3', 'US',
    ['Paradigm', 'Electric Capital'],
    'ChainBase Raises $65M for Cross-Chain Data Infrastructure',
    'Universal blockchain data indexing and analytics platform. 50K+ developer API users.',
    ['btc-usdt-spot', 'eth-usdt-spot'], 72),

  mkDeal('Helios Compute', 'GROWTH', 500_000_000, 4_000_000_000, 'INFRASTRUCTURE', 'US',
    ['General Atlantic', 'Coatue Management'],
    'Helios Compute Raises $500M to Challenge Cloud Giants',
    'GPU-cloud infrastructure optimized for AI workloads. 40% cheaper than AWS for ML training.',
    ['nvda'], 96),

  mkDeal('Meridian Defense', 'SERIES_A', 35_000_000, null, 'DEFENSE', 'US',
    ['Andreessen Horowitz', 'Primer Capital'],
    'Meridian Defense Raises $35M for Autonomous Drone Swarms',
    'AI-powered drone coordination for defense and border security applications.',
    [], 120),

  mkDeal('Eclipse Partners', 'NEW_FUND', 750_000_000, null, 'AI_ML', 'US',
    ['Eclipse Partners'],
    'Eclipse Partners Closes $750M AI-Focused Fund',
    'New fund targeting AI infrastructure, applied AI, and autonomous systems investments.',
    ['nvda', 'msft', 'aapl'], 144),
]

// ─── MOCK PROVIDER ──────────────────────────────────────────

export const createMockVCProvider = (): VCDataProvider => ({
  id: 'mock_vc',
  name: 'Mock VC Intelligence',
  status: 'mock',

  getDeals: async (sector) => {
    if (!sector) return [...MOCK_DEALS]
    return MOCK_DEALS.filter((d) => d.sector === sector)
  },

  getAllDeals: async () =>
    [...MOCK_DEALS].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),

  healthCheck: async () => ({ ok: true }),
})
