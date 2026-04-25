import type { SignalType, SignalDirection } from '@/types'

export interface SignalConfig {
  type: SignalType
  direction: SignalDirection
  defaultStrength: number
  description: string
}

export const SIGNAL_CONFIGS: Record<SignalType, SignalConfig> = {
  RSI_OVERSOLD: {
    type: 'RSI_OVERSOLD',
    direction: 'bullish',
    defaultStrength: 0.7,
    description: 'RSI below 30 — oversold territory',
  },
  RSI_OVERBOUGHT: {
    type: 'RSI_OVERBOUGHT',
    direction: 'bearish',
    defaultStrength: 0.7,
    description: 'RSI above 70 — overbought territory',
  },
  BB_SQUEEZE: {
    type: 'BB_SQUEEZE',
    direction: 'neutral',
    defaultStrength: 0.6,
    description: 'Bollinger bandwidth below 2% — volatility compression',
  },
  BB_BREAKOUT_UP: {
    type: 'BB_BREAKOUT_UP',
    direction: 'bullish',
    defaultStrength: 0.8,
    description: 'Price broke above upper Bollinger Band',
  },
  BB_BREAKOUT_DOWN: {
    type: 'BB_BREAKOUT_DOWN',
    direction: 'bearish',
    defaultStrength: 0.8,
    description: 'Price broke below lower Bollinger Band',
  },
  DC_BREAKOUT_UP: {
    type: 'DC_BREAKOUT_UP',
    direction: 'bullish',
    defaultStrength: 0.85,
    description: 'Price broke above the prior 20-bar high (Donchian)',
  },
  DC_BREAKOUT_DOWN: {
    type: 'DC_BREAKOUT_DOWN',
    direction: 'bearish',
    defaultStrength: 0.85,
    description: 'Price broke below the prior 20-bar low (Donchian)',
  },
  DC_MID_CROSS_UP: {
    type: 'DC_MID_CROSS_UP',
    direction: 'bullish',
    defaultStrength: 0.55,
    description: 'Price crossed above the Donchian midline — early trend hint',
  },
  DC_MID_CROSS_DOWN: {
    type: 'DC_MID_CROSS_DOWN',
    direction: 'bearish',
    defaultStrength: 0.55,
    description: 'Price crossed below the Donchian midline — early trend hint',
  },
  HIGH_VOLUME: {
    type: 'HIGH_VOLUME',
    direction: 'neutral',
    defaultStrength: 0.6,
    description: 'Volume exceeds 2.5x the 20-period average',
  },
  EMA_CROSS_BULL: {
    type: 'EMA_CROSS_BULL',
    direction: 'bullish',
    defaultStrength: 0.9,
    description: 'EMA 20 crossed above EMA 50 — golden cross',
  },
  EMA_CROSS_BEAR: {
    type: 'EMA_CROSS_BEAR',
    direction: 'bearish',
    defaultStrength: 0.9,
    description: 'EMA 20 crossed below EMA 50 — death cross',
  },
  STRUCT_BULL: {
    type: 'STRUCT_BULL',
    direction: 'bullish',
    defaultStrength: 0.75,
    description: 'Bullish market structure — higher highs & higher lows',
  },
  STRUCT_BEAR: {
    type: 'STRUCT_BEAR',
    direction: 'bearish',
    defaultStrength: 0.75,
    description: 'Bearish market structure — lower highs & lower lows',
  },

  // ── Corporate ────────────────────────────────────────────
  CORP_EARNINGS_SURPRISE: {
    type: 'CORP_EARNINGS_SURPRISE',
    direction: 'neutral',
    defaultStrength: 0.8,
    description: 'Earnings beat or miss vs consensus',
  },
  CORP_GUIDANCE_CHANGE: {
    type: 'CORP_GUIDANCE_CHANGE',
    direction: 'neutral',
    defaultStrength: 0.75,
    description: 'Company guidance raised or cut',
  },
  CORP_INSIDER_ACTIVITY: {
    type: 'CORP_INSIDER_ACTIVITY',
    direction: 'neutral',
    defaultStrength: 0.6,
    description: 'Insider buying or selling detected',
  },
  CORP_MA_EVENT: {
    type: 'CORP_MA_EVENT',
    direction: 'neutral',
    defaultStrength: 0.85,
    description: 'M&A, buyback, or secondary offering announced',
  },
  CORP_REGULATORY: {
    type: 'CORP_REGULATORY',
    direction: 'bearish',
    defaultStrength: 0.7,
    description: 'Litigation or regulatory pressure reported',
  },

  // ── Macro ────────────────────────────────────────────────
  MACRO_RATE_CHANGE: {
    type: 'MACRO_RATE_CHANGE',
    direction: 'neutral',
    defaultStrength: 0.9,
    description: 'Central bank rate decision or yield shift',
  },
  MACRO_INFLATION_SHIFT: {
    type: 'MACRO_INFLATION_SHIFT',
    direction: 'neutral',
    defaultStrength: 0.8,
    description: 'Inflation data surprised above or below expectations',
  },
  MACRO_SENTIMENT_SHIFT: {
    type: 'MACRO_SENTIMENT_SHIFT',
    direction: 'neutral',
    defaultStrength: 0.7,
    description: 'Risk sentiment shift (VIX, DXY, consumer confidence)',
  },
}

// ─── THRESHOLDS ─────────────────────────────────────────────

export const SIGNAL_THRESHOLDS = {
  RSI_OVERSOLD: 30,
  RSI_OVERBOUGHT: 70,
  BB_SQUEEZE_WIDTH: 0.02,        // 2% bandwidth
  HIGH_VOLUME_RATIO: 2.5,        // 2.5x average
  // Donchian breakout uses the prior N-bar high/low excluding the
  // current candle. 20 bars is the canonical "Turtle" period — long
  // enough to filter intraday noise, short enough to fire on real
  // regime changes.
  DC_BREAKOUT_PERIOD: 20,
} as const
