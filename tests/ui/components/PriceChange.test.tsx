import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PriceChange } from '@/ui/components/PriceChange'
import { colors } from '@/ui/theme'

afterEach(() => cleanup())

describe('<PriceChange />', () => {
  it('renders an em-dash for null', () => {
    render(<PriceChange change={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders an em-dash for NaN', () => {
    render(<PriceChange change={Number.NaN} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders an em-dash for ±Infinity (filtered by isValidNumber)', () => {
    render(<PriceChange change={Number.POSITIVE_INFINITY} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('formats positive percentages with a + sign and green color', () => {
    render(<PriceChange change={0.0123} />)
    const el = screen.getByText('+1.23%')
    expect(el).toBeInTheDocument()
    expect(el).toHaveStyle({ color: colors.green })
  })

  it('formats negative percentages without an extra sign and uses red color', () => {
    render(<PriceChange change={-0.05} />)
    const el = screen.getByText('-5.00%')
    expect(el).toBeInTheDocument()
    expect(el).toHaveStyle({ color: colors.red })
  })

  it('treats exactly zero as positive (sign "+", green)', () => {
    render(<PriceChange change={0} />)
    const el = screen.getByText('+0.00%')
    expect(el).toBeInTheDocument()
    expect(el).toHaveStyle({ color: colors.green })
  })

  it('formats absolute deltas via format="abs"', () => {
    render(<PriceChange change={12.345} format="abs" />)
    expect(screen.getByText('+12.35')).toBeInTheDocument()
  })

  it('renders the suffix text inside the badge', () => {
    render(<PriceChange change={0.01} suffix="24h" />)
    expect(screen.getByText('+1.00%')).toBeInTheDocument()
    expect(screen.getByText('24h')).toBeInTheDocument()
  })

  it('omits the suffix when not provided', () => {
    render(<PriceChange change={0.01} />)
    expect(screen.queryByText('24h')).not.toBeInTheDocument()
  })

  it('sets the title attribute and cursor:help when title is provided', () => {
    render(<PriceChange change={0.01} title="rolling 24h vs spot" />)
    const el = screen.getByText('+1.00%')
    expect(el).toHaveAttribute('title', 'rolling 24h vs spot')
    expect(el).toHaveStyle({ cursor: 'help' })
  })

  it('omits cursor:help when no title is given', () => {
    render(<PriceChange change={0.01} />)
    const el = screen.getByText('+1.00%')
    // jsdom serialises the missing style as the empty string.
    expect(el.style.cursor).toBe('')
  })
})
