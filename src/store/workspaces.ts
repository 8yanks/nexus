// ─── WORKSPACES STORE — named UI presets ────────────────────
//
// A "workspace" is a named snapshot of the user's UI preferences. Phase
// 1.5 ships theme + density only; later phases can extend the snapshot
// shape (audit-filter, watchlist, panel sizes, etc.) without breaking
// the storage format because we version the key (`nexus.workspaces.v1`)
// and validate-then-default on read.
//
// Design notes:
// - We roll our own localStorage rather than use zustand-persist so the
//   read happens once at module-load (matching the existing pattern in
//   `prefs.ts` and `auditFilter.ts`). No async hydration shenanigans.
// - `applyWorkspace(id)` writes its theme + density to the prefs keys
//   AND triggers the page reload — same UX contract as setTheme/
//   setDensity. This guarantees the rest of the app sees the new
//   palette consistently.
// - `activeId` is purely cosmetic (for the "active" highlight in the
//   switcher). It can drift from reality if the user manually toggles
//   theme outside the workspace UI; we don't try to detect that.

import { create } from 'zustand'
import type { ThemeName, DensityName } from '@/ui/tokens'
import {
  THEME_STORAGE_KEY,
  DENSITY_STORAGE_KEY,
} from '@/ui/prefs'

export const WORKSPACES_STORAGE_KEY = 'nexus.workspaces.v1'

export interface Workspace {
  id: string
  name: string
  /** ms since epoch; used for stable display order (newest first). */
  createdAt: number
  theme: ThemeName
  density: DensityName
}

interface PersistedShape {
  workspaces: Workspace[]
  activeId: string | null
}

// ─── VALIDATION ──────────────────────────────────────────────
// Anything trusted from localStorage must round-trip these guards. A
// single bad field falls back to the defaults — silent recovery is the
// right call for cosmetic state.

const isThemeName = (v: unknown): v is ThemeName =>
  v === 'dark' || v === 'light'

const isDensityName = (v: unknown): v is DensityName =>
  v === 'compact' || v === 'comfy' || v === 'spacious'

const isWorkspace = (v: unknown): v is Workspace => {
  if (!v || typeof v !== 'object') return false
  const w = v as Record<string, unknown>
  return (
    typeof w.id === 'string' &&
    w.id.length > 0 &&
    typeof w.name === 'string' &&
    typeof w.createdAt === 'number' &&
    Number.isFinite(w.createdAt) &&
    isThemeName(w.theme) &&
    isDensityName(w.density)
  )
}

const isPersistedShape = (v: unknown): v is PersistedShape => {
  if (!v || typeof v !== 'object') return false
  const p = v as Record<string, unknown>
  if (!Array.isArray(p.workspaces)) return false
  if (!p.workspaces.every(isWorkspace)) return false
  if (p.activeId !== null && typeof p.activeId !== 'string') return false
  return true
}

const loadPersisted = (): PersistedShape => {
  try {
    const raw = globalThis.localStorage?.getItem(WORKSPACES_STORAGE_KEY)
    if (!raw) return { workspaces: [], activeId: null }
    const parsed: unknown = JSON.parse(raw)
    if (isPersistedShape(parsed)) return parsed
  } catch {
    /* malformed JSON or no localStorage — fall through */
  }
  return { workspaces: [], activeId: null }
}

const savePersisted = (state: PersistedShape): void => {
  try {
    globalThis.localStorage?.setItem(
      WORKSPACES_STORAGE_KEY,
      JSON.stringify(state),
    )
  } catch {
    /* storage full / blocked — silently no-op */
  }
}

// Tiny id generator that doesn't pull a uuid dep. Collisions are
// statistically irrelevant at human-scale workspace counts.
const newId = (): string =>
  `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

// ─── STORE ───────────────────────────────────────────────────

export interface WorkspacesStore {
  workspaces: Workspace[]
  activeId: string | null
  /** Snapshot the current theme+density under a name. Returns the new id. */
  createWorkspace: (
    name: string,
    snapshot: { theme: ThemeName; density: DensityName },
  ) => string
  /** Rename an existing workspace. No-op if id unknown. */
  renameWorkspace: (id: string, name: string) => void
  /** Delete a workspace. Clears activeId if it pointed at this one. */
  deleteWorkspace: (id: string) => void
  /**
   * Activate a workspace: copy its theme+density into the prefs keys and
   * reload the page so theme.ts re-resolves. Returns false if id unknown.
   */
  applyWorkspace: (id: string) => boolean
}

const initial = loadPersisted()

export const useWorkspacesStore = create<WorkspacesStore>((set, get) => ({
  workspaces: initial.workspaces,
  activeId: initial.activeId,

  createWorkspace: (rawName, snapshot) => {
    const name = rawName.trim() || 'Workspace'
    const ws: Workspace = {
      id: newId(),
      name,
      createdAt: Date.now(),
      theme: snapshot.theme,
      density: snapshot.density,
    }
    const next: PersistedShape = {
      workspaces: [...get().workspaces, ws],
      activeId: get().activeId,
    }
    savePersisted(next)
    set(next)
    return ws.id
  },

  renameWorkspace: (id, rawName) => {
    const name = rawName.trim()
    if (!name) return
    const workspaces = get().workspaces.map((w) =>
      w.id === id ? { ...w, name } : w,
    )
    const next: PersistedShape = { workspaces, activeId: get().activeId }
    savePersisted(next)
    set({ workspaces })
  },

  deleteWorkspace: (id) => {
    const workspaces = get().workspaces.filter((w) => w.id !== id)
    const activeId = get().activeId === id ? null : get().activeId
    const next: PersistedShape = { workspaces, activeId }
    savePersisted(next)
    set({ workspaces, activeId })
  },

  applyWorkspace: (id) => {
    const ws = get().workspaces.find((w) => w.id === id)
    if (!ws) return false
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, ws.theme)
      globalThis.localStorage?.setItem(DENSITY_STORAGE_KEY, ws.density)
    } catch {
      /* storage blocked — bail without reload */
      return false
    }
    const next: PersistedShape = {
      workspaces: get().workspaces,
      activeId: id,
    }
    savePersisted(next)
    set({ activeId: id })
    if (typeof globalThis.location !== 'undefined') {
      setTimeout(() => globalThis.location.reload(), 0)
    }
    return true
  },
}))
