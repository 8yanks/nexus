import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MiniChart, buildSparklinePath } from '@/ui/components/MiniChart'
import { colors } from '@/ui/theme'

afterEach(() => cleanup())

// MiniChart was migrated from recharts to a hand-rolled inline SVG
// sparkline. The em-dash empty-state contract is preserved; on top of
// that we now own the geometry, so tests can pin coords directly.

describe('<MiniChart /> — empty-state branch', () => {
  it('renders em-dash when data is empty', () => {
    render(<MiniChart data={[]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders em-dash when only one valid point exists', () => {
    render(<MiniChart data={[42]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders em-dash when all values are NaN / Infinity (filtered out)', () => {
    render(
      <MiniChart
        data={[Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('em-dash uses muted text styling so it disappears into table chrome', () => {
    render(<MiniChart data={[]} />)
    const dash = screen.getByText('—')
    expect(dash).toHaveStyle({ color: colors.textDim })
  })
})

describe('<MiniChart /> — wrapper geometry', () => {
  it('applies the custom width / height props to the outer container', () => {
    const { container } = render(
      <MiniChart data={[1, 2]} width={120} height={50} />,
    )
    const wrapper = container.querySelector('div') as HTMLDivElement
    expect(wrapper.style.width).toBe('120px')
    expect(wrapper.style.height).toBe('50px')
  })

  it('falls back to default 80×30 dimensions', () => {
    const { container } = render(<MiniChart data={[1, 2]} />)
    const wrapper = container.querySelector('div') as HTMLDivElement
    expect(wrapper.style.width).toBe('80px')
    expect(wrapper.style.height).toBe('30px')
  })

  it('mixed valid + invalid samples still hit the chart branch when ≥2 valid', () => {
    render(<MiniChart data={[1, Number.NaN, 3, Number.POSITIVE_INFINITY]} />)
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(screen.getByTestId('minichart')).toBeInTheDocument()
  })
})

describe('<MiniChart /> — SVG output', () => {
  it('renders an SVG with a single path when data is plottable', () => {
    const { container } = render(<MiniChart data={[1, 2, 3]} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.querySelectorAll('path').length).toBe(1)
  })

  it('exposes an aria-label for screen readers', () => {
    render(<MiniChart data={[1, 2, 3]} />)
    expect(screen.getByRole('img', { name: 'Recent price trend' })).toBeInTheDocument()
  })

  it('strokes green when the trend is up (last ≥ first)', () => {
    const { container } = render(<MiniChart data={[1, 2, 3]} />)
    const path = container.querySelector('path')
    expect(path?.getAttribute('stroke')).toBe(colors.green)
  })

  it('strokes red when the trend is down (last < first)', () => {
    const { container } = render(<MiniChart data={[3, 2, 1]} />)
    const path = container.querySelector('path')
    expect(path?.getAttribute('stroke')).toBe(colors.red)
  })

  it('honours an explicit color prop over the auto trend colour', () => {
    const { container } = render(
      <MiniChart data={[3, 2, 1]} color="#abcdef" />,
    )
    const path = container.querySelector('path')
    expect(path?.getAttribute('stroke')).toBe('#abcdef')
  })

  it('honours a custom strokeWidth', () => {
    const { container } = render(
      <MiniChart data={[1, 2, 3]} strokeWidth={3} />,
    )
    const path = container.querySelector('path')
    expect(path?.getAttribute('stroke-width')).toBe('3')
  })
})

describe('buildSparklinePath — pure geometry', () => {
  it('returns an empty string for <2 samples', () => {
    expect(buildSparklinePath([], 80, 30)).toBe('')
    expect(buildSparklinePath([1], 80, 30)).toBe('')
  })

  it('produces an SVG path starting with M and using L between points', () => {
    const path = buildSparklinePath([1, 2, 3], 80, 30)
    expect(path.startsWith('M ')).toBe(true)
    // 2 segments means 1 'L' (M x0 y0 L x1 y1 L x2 y2 → 2 L's)
    expect((path.match(/L /g) || []).length).toBe(2)
  })

  it('maps the lowest sample to the bottom and the highest to the top', () => {
    // Up-trend: first=min (bottom), last=max (top) — assumes inset=0.
    const path = buildSparklinePath([10, 20], 100, 40, 0)
    // "M 0.00 40.00 L 100.00 0.00"
    expect(path).toBe('M 0.00 40.00 L 100.00 0.00')
  })

  it('respects the inset (1px default in the component)', () => {
    const path = buildSparklinePath([10, 20], 100, 40, 1)
    // inner = 98 wide, 38 tall. Min(10) → bottom = 1 + 38 = 39; Max(20) → top = 1.
    expect(path).toBe('M 1.00 39.00 L 99.00 1.00')
  })

  it('flat series draws a horizontal mid-line (no divide-by-zero)', () => {
    const path = buildSparklinePath([5, 5, 5], 100, 40, 0)
    // y = (1 - 0.5) * 40 = 20 for every point
    expect(path).toBe('M 0.00 20.00 L 50.00 20.00 L 100.00 20.00')
  })

  it('spaces x-coordinates evenly across the inner width', () => {
    const path = buildSparklinePath([0, 1, 2, 3, 4], 80, 30, 0)
    // 4 segments → step = 20 px
    expect(path).toMatch(/M 0\.00 .* L 20\.00 .* L 40\.00 .* L 60\.00 .* L 80\.00/)
  })
})
