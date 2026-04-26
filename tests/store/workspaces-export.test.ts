import { describe, it, expect } from 'vitest'
import {
  exportWorkspaces,
  exportWorkspacesAsJson,
  importWorkspaces,
  mergeWorkspaces,
  EXPORT_SCHEMA_VERSION,
} from '@/store/workspaces-export'
import type { Workspace } from '@/store/workspaces'

const mkWorkspace = (over: Partial<Workspace> = {}): Workspace => ({
  id: 'ws_test_1',
  name: 'Trading day',
  createdAt: Date.UTC(2026, 3, 19, 10, 0, 0),
  theme: 'dark',
  density: 'comfy',
  ...over,
})

describe('exportWorkspaces', () => {
  it('produces a versioned bundle with the correct schema header', () => {
    const bundle = exportWorkspaces([mkWorkspace()])
    expect(bundle.schema).toBe('nexus.workspaces.export')
    expect(bundle.version).toBe(EXPORT_SCHEMA_VERSION)
    expect(bundle.workspaces).toHaveLength(1)
    expect(typeof bundle.exportedAt).toBe('string')
    // ISO timestamp format
    expect(() => new Date(bundle.exportedAt).toISOString()).not.toThrow()
  })

  it('detaches workspace entries from the original array (no shared refs)', () => {
    const original = mkWorkspace()
    const bundle = exportWorkspaces([original])
    expect(bundle.workspaces[0]).toEqual(original)
    expect(bundle.workspaces[0]).not.toBe(original)
  })

  it('handles an empty workspace list', () => {
    const bundle = exportWorkspaces([])
    expect(bundle.workspaces).toEqual([])
  })
})

describe('exportWorkspacesAsJson', () => {
  it('round-trips through JSON.parse', () => {
    const ws = [mkWorkspace(), mkWorkspace({ id: 'ws_test_2', name: 'Research' })]
    const json = exportWorkspacesAsJson(ws)
    const parsed = JSON.parse(json)
    expect(parsed.schema).toBe('nexus.workspaces.export')
    expect(parsed.workspaces).toHaveLength(2)
  })
})

describe('importWorkspaces', () => {
  it('accepts a freshly exported bundle', () => {
    const json = exportWorkspacesAsJson([mkWorkspace()])
    const result = importWorkspaces(json)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.workspaces).toHaveLength(1)
  })

  it('rejects malformed JSON with a friendly message', () => {
    const result = importWorkspaces('{not-json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/invalid json/i)
  })

  it('rejects JSON that is not an object at the top level', () => {
    const result = importWorkspaces(JSON.stringify([1, 2, 3]))
    expect(result.ok).toBe(false)
  })

  it('rejects payloads with the wrong schema name', () => {
    const result = importWorkspaces(JSON.stringify({ schema: 'something-else', workspaces: [] }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/wrong schema/i)
  })

  it('rejects future schema versions', () => {
    const future = {
      schema: 'nexus.workspaces.export',
      version: EXPORT_SCHEMA_VERSION + 99,
      exportedAt: new Date().toISOString(),
      workspaces: [mkWorkspace()],
    }
    const result = importWorkspaces(JSON.stringify(future))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/unsupported version/i)
  })

  it('rejects when workspaces is not an array', () => {
    const bad = {
      schema: 'nexus.workspaces.export',
      version: EXPORT_SCHEMA_VERSION,
      workspaces: 'oops',
    }
    const result = importWorkspaces(JSON.stringify(bad))
    expect(result.ok).toBe(false)
  })

  it('rejects when one workspace entry has a wrong shape', () => {
    const bad = {
      schema: 'nexus.workspaces.export',
      version: EXPORT_SCHEMA_VERSION,
      workspaces: [{ id: 'ok', name: 'Bad', createdAt: 'not-a-number', theme: 'dark', density: 'comfy' }],
    }
    const result = importWorkspaces(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/failed validation/i)
  })

  it('rejects unknown theme / density values', () => {
    const bad = {
      schema: 'nexus.workspaces.export',
      version: EXPORT_SCHEMA_VERSION,
      workspaces: [mkWorkspace({ theme: 'neon' as never })],
    }
    const result = importWorkspaces(JSON.stringify(bad))
    expect(result.ok).toBe(false)
  })
})

describe('mergeWorkspaces', () => {
  it('appends incoming workspaces with new ids', () => {
    const existing = [mkWorkspace({ id: 'a' })]
    const incoming = [mkWorkspace({ id: 'b' }), mkWorkspace({ id: 'c' })]
    const merged = mergeWorkspaces(existing, incoming)
    expect(merged.map((w) => w.id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps the EXISTING entry when ids collide (no overwrite)', () => {
    const existing = [mkWorkspace({ id: 'a', name: 'original' })]
    const incoming = [mkWorkspace({ id: 'a', name: 'imported' })]
    const merged = mergeWorkspaces(existing, incoming)
    expect(merged).toHaveLength(1)
    expect(merged[0].name).toBe('original')
  })

  it('handles empty inputs', () => {
    expect(mergeWorkspaces([], [])).toEqual([])
    expect(mergeWorkspaces([mkWorkspace()], [])).toHaveLength(1)
    expect(mergeWorkspaces([], [mkWorkspace()])).toHaveLength(1)
  })
})
