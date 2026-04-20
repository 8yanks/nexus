import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MiniChart } from '@/ui/components/MiniChart'
import { colors } from '@/ui/theme'

afterEach(() => cleanup())

// MiniChart wraps recharts which doesn't render measurable SVG paths in
// JSDom (no layout engine). We assert on the things we control:
//   - the em-dash empty-state branch
//   - the outer container's dimensions
//   - the NaN/Infinity filter that gates which branch we hit

describe('<MiniChart />', () => {
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

  it('renders the chart container (not em-dash) once 2+ valid points exist', () => {
    const { container } = render(<MiniChart data={[1, 2, 3, 4]} />)
    // No em-dash this time
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    // Outer wrapper is the only div we own; it carries width/height.
    const wrapper = container.querySelector('div')
    expect(wrapper).not.toBeNull()
  })

  it('applies the custom width / height props to the outer container', () => {
    const { container } = render(<MiniChart data={[1, 2]} width={120} height={50} />)
    const wrapper = container.querySelector('div') as HTMLDivElement
    expect(wrapper.style.width).toBe('120px')
    expect(wrapper.style.height).toBe('50px')
  })

  it('falls back to the default width / height when not provided', () => {
    const { container } = render(<MiniChart data={[1, 2]} />)
    const wrapper = container.querySelector('div') as HTMLDivElement
    expect(wrapper.style.width).toBe('80px')
    expect(wrapper.style.height).toBe('30px')
  })

  it('mixed valid + invalid samples still hit the chart branch when ≥2 valid', () => {
    // 2 valid (1, 3) + 2 invalid → length≥2 after filter → no em-dash
    render(<MiniChart data={[1, Number.NaN, 3, Number.POSITIVE_INFINITY]} />)
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })
})
