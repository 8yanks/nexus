// ─── WORKSPACES — export / import bridge ────────────────────
//
// Lets users share their tuned setups across machines or with
// teammates. Exports all stored workspaces as a JSON document with a
// version header; imports validate the same shape and ADD to the
// existing list (no clobber — the user explicitly removes via the
// Manager UI if they want to replace).
//
// Why a separate module: keeps the store core lean (no JSON
// serialization concerns inside the zustand reducer), makes it
// trivially unit-testable without spinning up a real store, and
// surfaces a clear public contract for what the export format looks
// like (callers in the UI use this exact shape).

import type { Workspace } from '@/store/workspaces'
import type { ThemeName, DensityName } from '@/ui/tokens'

/** Schema version for the export bundle. Bump on incompatible changes
 *  to the Workspace shape — the importer will reject older versions
 *  cleanly with a clear error. */
export const EXPORT_SCHEMA_VERSION = 1

export interface WorkspaceExportBundle {
  schema: 'nexus.workspaces.export'
  version: typeof EXPORT_SCHEMA_VERSION
  exportedAt: string
  workspaces: Workspace[]
}

export const exportWorkspaces = (workspaces: Workspace[]): WorkspaceExportBundle => ({
  schema: 'nexus.workspaces.export',
  version: EXPORT_SCHEMA_VERSION,
  exportedAt: new Date().toISOString(),
  // Spread to avoid the importer holding a reference to the live store array.
  workspaces: workspaces.map((w) => ({ ...w })),
})

export const exportWorkspacesAsJson = (workspaces: Workspace[]): string =>
  JSON.stringify(exportWorkspaces(workspaces), null, 2)

// ─── Import side ────────────────────────────────────────────

export type ImportResult =
  | { ok: true; workspaces: Workspace[] }
  | { ok: false; error: string }

const isThemeName = (v: unknown): v is ThemeName =>
  v === 'dark' || v === 'light'

const isDensityName = (v: unknown): v is DensityName =>
  v === 'compact' || v === 'comfy' || v === 'spacious'

const isWorkspace = (v: unknown): v is Workspace => {
  if (!v || typeof v !== 'object') return false
  const w = v as Record<string, unknown>
  return (
    typeof w.id === 'string' && w.id.length > 0 &&
    typeof w.name === 'string' &&
    typeof w.createdAt === 'number' && Number.isFinite(w.createdAt) &&
    isThemeName(w.theme) &&
    isDensityName(w.density)
  )
}

/**
 * Parse a JSON string into a validated bundle. Returns a discriminated
 * union — caller always knows whether it got a usable workspace list or
 * a human-readable error to surface.
 *
 * Rejected cases:
 * - JSON parse failure
 * - Wrong schema name (someone pasted random JSON)
 * - Future schema version we don't understand
 * - Workspace entry that doesn't validate
 */
export const importWorkspaces = (json: string): ImportResult => {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Invalid JSON — could not parse the file.' }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Expected a JSON object at the top level.' }
  }
  const obj = parsed as Record<string, unknown>

  if (obj.schema !== 'nexus.workspaces.export') {
    return {
      ok: false,
      error: 'This file is not a NEXUS workspaces export (wrong schema).',
    }
  }

  if (typeof obj.version !== 'number' || obj.version > EXPORT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported version (${String(obj.version)}). This NEXUS build understands v${EXPORT_SCHEMA_VERSION} and earlier.`,
    }
  }

  if (!Array.isArray(obj.workspaces)) {
    return { ok: false, error: 'Bundle is missing the workspaces array.' }
  }
  if (!obj.workspaces.every(isWorkspace)) {
    return {
      ok: false,
      error: 'One or more workspace entries failed validation (wrong shape).',
    }
  }

  return { ok: true, workspaces: obj.workspaces }
}

/**
 * Merge imported workspaces into an existing list. Conflicts on `id`
 * are resolved by KEEPING the existing entry (caller can delete first
 * if they want a true replace). Returns the new list.
 */
export const mergeWorkspaces = (
  existing: Workspace[],
  incoming: Workspace[],
): Workspace[] => {
  const seenIds = new Set(existing.map((w) => w.id))
  const additions = incoming.filter((w) => !seenIds.has(w.id))
  return [...existing, ...additions]
}
