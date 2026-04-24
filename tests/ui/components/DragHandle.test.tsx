import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { useState } from 'react'
import { DragHandle } from '@/ui/components/DragHandle'

afterEach(() => cleanup())

// ─── HARNESS ────────────────────────────────────────────────
// DragHandle is fully controlled; the parent owns the height. This
// mini host gives us a real state cycle so we can assert what the
// component actually pushes back to the parent on drag/keyboard.
const Host = ({
  initial = 200,
  min,
  max,
  onChange,
}: {
  initial?: number
  min?: number
  max?: number
  onChange?: (n: number) => void
}) => {
  const [h, setH] = useState(initial)
  return (
    <div>
      <DragHandle
        value={h}
        min={min}
        max={max}
        onResize={(next) => {
          setH(next)
          onChange?.(next)
        }}
      />
      <div data-testid="height-readout">{h}</div>
    </div>
  )
}

describe('<DragHandle /> — accessibility', () => {
  it('exposes the ARIA separator role with current value bounds', () => {
    render(<Host initial={150} min={80} max={400} />)
    const sep = screen.getByRole('separator')
    expect(sep).toHaveAttribute('aria-orientation', 'horizontal')
    expect(sep).toHaveAttribute('aria-valuenow', '150')
    expect(sep).toHaveAttribute('aria-valuemin', '80')
    expect(sep).toHaveAttribute('aria-valuemax', '400')
    expect(sep).toHaveAttribute('aria-label', 'Resize panel')
  })

  it('honours a custom label', () => {
    render(
      <DragHandle value={100} onResize={() => {}} label="Resize stats panel" />,
    )
    expect(
      screen.getByRole('separator', { name: 'Resize stats panel' }),
    ).toBeInTheDocument()
  })

  it('is keyboard-focusable', () => {
    render(<Host />)
    const sep = screen.getByRole('separator')
    expect(sep).toHaveAttribute('tabIndex', '0')
  })
})

describe('<DragHandle /> — keyboard nudge', () => {
  it('ArrowUp grows the panel by 8px', () => {
    render(<Host initial={200} min={80} max={400} />)
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowUp' })
    expect(screen.getByTestId('height-readout').textContent).toBe('208')
  })

  it('ArrowDown shrinks the panel by 8px', () => {
    render(<Host initial={200} min={80} max={400} />)
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowDown' })
    expect(screen.getByTestId('height-readout').textContent).toBe('192')
  })

  it('Shift doubles the step to 16px', () => {
    render(<Host initial={200} min={80} max={400} />)
    fireEvent.keyDown(screen.getByRole('separator'), {
      key: 'ArrowUp',
      shiftKey: true,
    })
    expect(screen.getByTestId('height-readout').textContent).toBe('216')
  })

  it('clamps to max on ArrowUp', () => {
    render(<Host initial={398} min={80} max={400} />)
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowUp' })
    // 398 + 8 = 406, clamped to 400
    expect(screen.getByTestId('height-readout').textContent).toBe('400')
  })

  it('clamps to min on ArrowDown', () => {
    render(<Host initial={84} min={80} max={400} />)
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowDown' })
    // 84 - 8 = 76, clamped to 80
    expect(screen.getByTestId('height-readout').textContent).toBe('80')
  })

  it('ignores other keys', () => {
    render(<Host initial={200} />)
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'Enter' })
    expect(screen.getByTestId('height-readout').textContent).toBe('200')
  })
})

describe('<DragHandle /> — mouse drag', () => {
  it('drag down by 30px shrinks the panel by 30 (panel is BELOW)', () => {
    const onChange = vi.fn()
    render(<Host initial={200} min={80} max={400} onChange={onChange} />)
    const sep = screen.getByRole('separator')

    // Mouse down at y=100; the handle now listens on window.
    fireEvent.mouseDown(sep, { clientY: 100 })
    // Move to y=130 → dy = +30 → next height = 200 - 30 = 170
    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientY: 130 }) as MouseEvent,
      )
    })
    expect(screen.getByTestId('height-readout').textContent).toBe('170')
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup') as MouseEvent)
    })
  })

  it('drag up by 30px grows the panel by 30', () => {
    render(<Host initial={200} min={80} max={400} />)
    const sep = screen.getByRole('separator')
    fireEvent.mouseDown(sep, { clientY: 100 })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientY: 70 }))
    })
    expect(screen.getByTestId('height-readout').textContent).toBe('230')
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })

  it('clamps the drag to the configured bounds', () => {
    render(<Host initial={200} min={150} max={250} />)
    const sep = screen.getByRole('separator')
    fireEvent.mouseDown(sep, { clientY: 100 })
    // Drag way down → would be far below min, clamped to 150.
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientY: 1000 }))
    })
    expect(screen.getByTestId('height-readout').textContent).toBe('150')
    // Drag way up → would be far above max, clamped to 250.
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientY: -1000 }))
    })
    expect(screen.getByTestId('height-readout').textContent).toBe('250')
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })

  it('stops responding to mousemove after mouseup', () => {
    render(<Host initial={200} min={80} max={400} />)
    const sep = screen.getByRole('separator')
    fireEvent.mouseDown(sep, { clientY: 100 })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientY: 80 }))
    })
    expect(screen.getByTestId('height-readout').textContent).toBe('220')
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
    // After mouseup, further moves should NOT change the height.
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientY: 0 }))
    })
    expect(screen.getByTestId('height-readout').textContent).toBe('220')
  })

  it('restores the body cursor after drag ends', () => {
    render(<Host initial={200} />)
    const sep = screen.getByRole('separator')
    fireEvent.mouseDown(sep, { clientY: 100 })
    expect(document.body.style.cursor).toBe('row-resize')
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
  })
})
