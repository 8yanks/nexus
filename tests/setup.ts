import '@testing-library/jest-dom'

// ─── JSDom polyfills ────────────────────────────────────────
// JSDom doesn't ship matchMedia or ResizeObserver. lightweight-charts
// (and any future canvas-based chart lib) crashes on import without
// them. Stubbing both globally keeps tests honest about what's tested
// (component contract + DOM structure) without needing per-suite
// monkey-patching.

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  }

  if (!('ResizeObserver' in window)) {
    class StubResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    ;(window as unknown as { ResizeObserver: typeof StubResizeObserver }).ResizeObserver = StubResizeObserver
  }
}
