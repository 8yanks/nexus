import { useCallback, useEffect, useRef, useState } from 'react'
import { colors } from '@/ui/theme'

// ─── DRAG HANDLE — vertical (top-bottom) resize control ────
//
// Thin horizontal bar the user drags to resize the panel BELOW it.
// Used in the Dashboard split-view to change how much room the
// stats/signals pane gets vs the chart above it.
//
// Behaviour:
// - mouse-down on the handle starts a drag; we attach the move/up
//   listeners to `window` so the cursor can leave the handle while
//   dragging without breaking the gesture
// - the handle reports new heights via `onResize(nextH)`; the parent
//   owns the actual height state (so it can clamp + persist)
// - while dragging, body cursor is forced to row-resize so the
//   feedback is consistent even over child elements
//
// Keyboard: Up/Down arrows nudge the height by 8px (16px with Shift).
// Helps users who can't drag (assistive devices, trackpad-shy users).

interface Props {
  /** Current height of the panel below in px. */
  value: number
  /** Called with the next clamped height as the user drags / nudges. */
  onResize: (nextHeight: number) => void
  /** Min/max bounds applied during drag + keyboard nudges. */
  min?: number
  max?: number
  /** ARIA label, e.g. "Resize bottom panel". */
  label?: string
}

export const DragHandle = ({
  value,
  onResize,
  min = 80,
  max = 600,
  label = 'Resize panel',
}: Props) => {
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const startH = useRef(value)

  const handleMove = useCallback(
    (e: MouseEvent) => {
      // Increasing pointer Y means the bottom panel shrinks.
      const dy = e.clientY - startY.current
      const next = Math.max(min, Math.min(max, startH.current - dy))
      onResize(next)
    },
    [max, min, onResize],
  )

  const handleUp = useCallback(() => {
    setDragging(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [dragging, handleMove, handleUp])

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startY.current = e.clientY
    startH.current = value
    setDragging(true)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 16 : 8
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      onResize(Math.min(max, value + step))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onResize(Math.max(min, value - step))
    }
  }

  return (
    /* ARIA 1.2 considers separator with aria-valuenow as a focusable
       splitter widget — equivalent to an HTML range input. The lint
       rule treats it as non-interactive, hence the per-prop disables.
       Keyboard handler IS wired (ArrowUp/Down). */
    /* eslint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions */
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      style={{
        height: 6,
        flexShrink: 0,
        cursor: 'row-resize',
        background: dragging ? colors.cyan : 'transparent',
        borderTop: `1px solid ${colors.border}`,
        borderBottom: `1px solid ${colors.border}`,
        transition: dragging ? 'none' : 'background 0.12s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!dragging) (e.currentTarget as HTMLDivElement).style.background = colors.bgHover
      }}
      onMouseLeave={(e) => {
        if (!dragging) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      {/* Visual grip — three short bars, centered */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          pointerEvents: 'none',
        }}
      >
        <span style={{ width: 16, height: 1, background: colors.border }} />
      </div>
    </div>
  )
  /* eslint-enable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions */
}
