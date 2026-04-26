import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ─── Service worker registration ────────────────────────────
// Production-only. In dev, Vite's HMR conflicts with a controlling
// SW (cached chunks shadow the in-flight HMR updates), so we skip
// registration on import.meta.env.DEV.
//
// The SW gives us:
// - Stale-while-revalidate cache for same-origin assets → instant
//   subsequent loads, offline tolerance.
// - "Add to Home Screen" install prompt becomes available alongside
//   the manifest from public/manifest.webmanifest.
//
// Failure path: if registration throws (browser without SW support,
// strict CSP, etc.), the app continues to work — the SW is purely
// additive. We log to console for debugging but never throw.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('[SW] registration failed:', err))
  })
}
