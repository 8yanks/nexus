import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { WorkspaceManager } from '@/ui/components/WorkspaceManager'
import { useWorkspacesStore } from '@/store/workspaces'
import {
  THEME_STORAGE_KEY,
  DENSITY_STORAGE_KEY,
} from '@/ui/prefs'

// ─── ENVIRONMENT ────────────────────────────────────────────
beforeEach(() => {
  window.localStorage.clear()
  useWorkspacesStore.setState({ workspaces: [], activeId: null })
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('<WorkspaceManager /> — empty state', () => {
  it('renders the empty placeholder + the "Nouveau workspace" CTA', () => {
    render(<WorkspaceManager />)
    expect(screen.getByText(/Aucun workspace enregistré/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nouveau workspace/i })).toBeInTheDocument()
  })
})

describe('<WorkspaceManager /> — create flow', () => {
  it('opens the input row when "Nouveau workspace" is clicked', () => {
    render(<WorkspaceManager />)
    fireEvent.click(screen.getByRole('button', { name: /Nouveau workspace/i }))
    expect(screen.getByLabelText('Nom du nouveau workspace')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
  })

  it('creates a workspace via Enter and closes the input', () => {
    render(<WorkspaceManager />)
    fireEvent.click(screen.getByRole('button', { name: /Nouveau workspace/i }))
    const input = screen.getByLabelText('Nom du nouveau workspace')
    fireEvent.change(input, { target: { value: 'Trading' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    const list = useWorkspacesStore.getState().workspaces
    expect(list).toHaveLength(1)
    expect(list[0]?.name).toBe('Trading')
    // The input row collapses back to the CTA.
    expect(screen.queryByLabelText('Nom du nouveau workspace')).not.toBeInTheDocument()
  })

  it('Escape cancels the create input without persisting', () => {
    render(<WorkspaceManager />)
    fireEvent.click(screen.getByRole('button', { name: /Nouveau workspace/i }))
    const input = screen.getByLabelText('Nom du nouveau workspace')
    fireEvent.change(input, { target: { value: 'Cancelled' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(useWorkspacesStore.getState().workspaces).toHaveLength(0)
  })
})

describe('<WorkspaceManager /> — list rendering', () => {
  it('renders the saved workspaces with theme + density meta', () => {
    useWorkspacesStore.setState({
      workspaces: [
        {
          id: 'a',
          name: 'Trading',
          createdAt: 1,
          theme: 'dark',
          density: 'comfy',
        },
        {
          id: 'b',
          name: 'Reading',
          createdAt: 2,
          theme: 'light',
          density: 'spacious',
        },
      ],
      activeId: null,
    })
    render(<WorkspaceManager />)
    expect(screen.getByText('Trading')).toBeInTheDocument()
    expect(screen.getByText('Reading')).toBeInTheDocument()
    expect(screen.getByText(/dark · comfy/)).toBeInTheDocument()
    expect(screen.getByText(/light · spacious/)).toBeInTheDocument()
  })

  it('orders workspaces newest-first (by createdAt desc)', () => {
    useWorkspacesStore.setState({
      workspaces: [
        { id: 'old', name: 'Old',   createdAt: 1, theme: 'dark', density: 'comfy' },
        { id: 'new', name: 'New',   createdAt: 9, theme: 'dark', density: 'comfy' },
        { id: 'mid', name: 'Mid',   createdAt: 5, theme: 'dark', density: 'comfy' },
      ],
      activeId: null,
    })
    render(<WorkspaceManager />)
    const list = screen.getByRole('list', { name: /Workspaces enregistrés/i })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.getAttribute('data-workspace-id'))).toEqual(['new', 'mid', 'old'])
  })

  it('marks the active workspace and disables its Activer button', () => {
    useWorkspacesStore.setState({
      workspaces: [
        { id: 'a', name: 'Active',   createdAt: 1, theme: 'dark', density: 'comfy' },
        { id: 'b', name: 'Inactive', createdAt: 2, theme: 'dark', density: 'comfy' },
      ],
      activeId: 'a',
    })
    render(<WorkspaceManager />)
    expect(screen.getByLabelText('Workspace actif')).toBeInTheDocument()
    const activeBtn = screen.getByRole('button', { name: /Activer Active/i })
    const inactiveBtn = screen.getByRole('button', { name: /Activer Inactive/i })
    expect(activeBtn).toBeDisabled()
    expect(inactiveBtn).not.toBeDisabled()
  })
})

describe('<WorkspaceManager /> — apply / delete / rename', () => {
  it('clicking Activer writes prefs and flips activeId in the store', () => {
    useWorkspacesStore.setState({
      workspaces: [
        { id: 'a', name: 'Light',  createdAt: 1, theme: 'light', density: 'spacious' },
      ],
      activeId: null,
    })
    render(<WorkspaceManager />)
    fireEvent.click(screen.getByRole('button', { name: /Activer Light/i }))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('spacious')
    expect(useWorkspacesStore.getState().activeId).toBe('a')
  })

  it('clicking the trash icon removes the workspace', () => {
    useWorkspacesStore.setState({
      workspaces: [
        { id: 'a', name: 'Doomed', createdAt: 1, theme: 'dark', density: 'comfy' },
      ],
      activeId: null,
    })
    render(<WorkspaceManager />)
    fireEvent.click(screen.getByRole('button', { name: /Supprimer Doomed/i }))
    expect(useWorkspacesStore.getState().workspaces).toHaveLength(0)
  })

  it('rename flow: pencil → input → Enter commits, Escape reverts', () => {
    useWorkspacesStore.setState({
      workspaces: [
        { id: 'a', name: 'Old', createdAt: 1, theme: 'dark', density: 'comfy' },
      ],
      activeId: null,
    })
    render(<WorkspaceManager />)
    fireEvent.click(screen.getByRole('button', { name: /Renommer Old/i }))
    const input = screen.getByLabelText('Renommer le workspace')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useWorkspacesStore.getState().workspaces[0]?.name).toBe('Renamed')

    // Now reopen rename and Escape — should not change.
    fireEvent.click(screen.getByRole('button', { name: /Renommer Renamed/i }))
    const input2 = screen.getByLabelText('Renommer le workspace')
    fireEvent.change(input2, { target: { value: 'Junk' } })
    fireEvent.keyDown(input2, { key: 'Escape' })
    expect(useWorkspacesStore.getState().workspaces[0]?.name).toBe('Renamed')
  })
})
