import { describe, it, expect } from 'vitest'
import { card, thStyle, tdStyle, activeDensity } from '@/ui/theme'

// ─── DENSITY-DERIVED SHARED STYLES ──────────────────────────
// theme.ts shared styles read padding from `activeDensity` so a single
// switch in Options → Apparence → Densité rescales every card / table
// row at module-load. The default density at test-time is 'comfy'
// (loadDensity() falls back to DEFAULT_DENSITY when localStorage is
// empty), giving padCard=14, padPanel=10.

describe('shared styles read padding from active density', () => {
  it('card padding matches activeDensity.padCard', () => {
    expect(card.padding).toBe(activeDensity.padCard)
  })

  it('thStyle vertical padding tracks activeDensity.padPanel', () => {
    // Format: "{padPanel}px 12px"
    expect(thStyle.padding).toBe(`${activeDensity.padPanel}px 12px`)
  })

  it('tdStyle vertical padding is padPanel - 2 (clamped to 4)', () => {
    const expected = Math.max(activeDensity.padPanel - 2, 4)
    expect(tdStyle.padding).toBe(`${expected}px 12px`)
  })

  it('default density is comfy, so card padding is 14', () => {
    // Sanity: confirms no test pollution flipped the default away.
    expect(activeDensity.padCard).toBe(14)
    expect(card.padding).toBe(14)
  })
})
