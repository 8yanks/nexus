import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { FreshnessDot } from '@/ui/components/FreshnessDot'
import { QualityBar } from '@/ui/components/QualityBar'
import { SeverityBadge } from '@/ui/components/SeverityBadge'
import { StatusBadge } from '@/ui/components/StatusBadge'
import { FRESHNESS_COLORS } from '@/utils/freshness'
import { colors } from '@/ui/theme'

afterEach(() => cleanup())

// ─── FreshnessDot ───────────────────────────────────────────
describe('<FreshnessDot />', () => {
  it('renders the "dead" tooltip + colour for null/undefined timestamps', () => {
    render(<FreshnessDot timestamp={null} />)
    const dot = screen.getByTitle('Data freshness: dead')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveStyle({ background: FRESHNESS_COLORS.dead })
  })

  it('renders the "fresh" colour and a glow shadow for a recent timestamp', () => {
    // Pin the clock so the freshness comparison is deterministic.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-18T10:00:00Z'))
    const recent = new Date('2026-04-18T09:59:55Z').toISOString() // 5s old
    try {
      render(<FreshnessDot timestamp={recent} />)
      const dot = screen.getByTitle('Data freshness: fresh')
      expect(dot).toHaveStyle({ background: FRESHNESS_COLORS.fresh })
      // Fresh dots get a glow box-shadow; non-fresh don't.
      expect(dot.style.boxShadow).not.toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('honours the size prop on width + height', () => {
    render(<FreshnessDot timestamp={null} size={16} />)
    const dot = screen.getByTitle('Data freshness: dead')
    expect(dot).toHaveStyle({ width: '16px', height: '16px' })
  })
})

// ─── QualityBar ─────────────────────────────────────────────
describe('<QualityBar />', () => {
  it('renders a green bar + label for high-quality scores', () => {
    render(<QualityBar score={0.95} />)
    const label = screen.getByText('95%')
    expect(label).toHaveStyle({ color: colors.green })
  })

  it('renders a yellow bar + label for mid-quality scores', () => {
    render(<QualityBar score={0.65} />)
    const label = screen.getByText('65%')
    expect(label).toHaveStyle({ color: colors.yellow })
  })

  it('renders a red bar + label for low-quality scores', () => {
    render(<QualityBar score={0.25} />)
    const label = screen.getByText('25%')
    expect(label).toHaveStyle({ color: colors.red })
  })

  it('hides the label when showLabel=false', () => {
    render(<QualityBar score={0.95} showLabel={false} />)
    expect(screen.queryByText('95%')).not.toBeInTheDocument()
  })

  it('caps the inner bar width at 100% even when score > 1', () => {
    const { container } = render(<QualityBar score={1.5} />)
    // The inner span carries the percentage width; outer is the track.
    const inner = container.querySelector('span > span > span') as HTMLSpanElement
    expect(inner.style.width).toBe('100%')
  })
})

// ─── SeverityBadge ──────────────────────────────────────────
describe('<SeverityBadge />', () => {
  it('renders info/warning/critical text with the right foreground colour', () => {
    const { rerender } = render(<SeverityBadge severity="info" />)
    expect(screen.getByText('info')).toHaveStyle({ color: colors.cyan })

    rerender(<SeverityBadge severity="warning" />)
    expect(screen.getByText('warning')).toHaveStyle({ color: colors.yellow })

    rerender(<SeverityBadge severity="critical" />)
    expect(screen.getByText('critical')).toHaveStyle({ color: colors.red })
  })
})

// ─── StatusBadge ────────────────────────────────────────────
describe('<StatusBadge />', () => {
  it('renders LIVE with a glowing dot', () => {
    const { container } = render(<StatusBadge status="LIVE" />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    // The dot is the only inner span — its presence proves the dot path fired.
    const dot = container.querySelector('span > span') as HTMLSpanElement
    expect(dot).not.toBeNull()
    expect(dot.style.boxShadow).not.toBe('')
  })

  it('renders DELAYED / SIMULATED / STALE / UNAVAILABLE / ERROR without a dot', () => {
    for (const status of ['DELAYED', 'SIMULATED', 'STALE', 'UNAVAILABLE', 'ERROR'] as const) {
      const { container, unmount } = render(<StatusBadge status={status} />)
      expect(screen.getByText(status)).toBeInTheDocument()
      // Only the wrapper span exists; no inner dot span on non-LIVE statuses.
      expect(container.querySelectorAll('span').length).toBe(1)
      unmount()
    }
  })

  it('falls back to UNAVAILABLE config for an unknown status', () => {
    // @ts-expect-error — exercising the runtime fallback path
    render(<StatusBadge status="WAT" />)
    // The label still uses the raw input — the fallback only swaps style cfg.
    expect(screen.getByText('WAT')).toBeInTheDocument()
  })
})
