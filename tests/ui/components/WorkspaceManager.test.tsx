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
  it('renders the empty placeholder + the "New workspace" CTA', () => {
    render(<WorkspaceManager />)
    expect(screen.getByText(/No workspace saved/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /New workspace/i })).toBeInTheDocument()
  })
})

describe('<WorkspaceManager /> — create flow', () => {
  it('opens the input row when "New workspace" is clicked', () => {
    render(<WorkspaceManager />)
    fireEvent.click(screen.getByRole('button', { name: /New workspace/i }))
    expect(screen.getByLabelText('New workspace name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('creates a workspace via Enter and closes the input', () => {
    render(<WorkspaceManager />)
    fireEvent.click(screen.getByRole('button', { name: /New workspace/i }))
    const input = screen.getByLabelText('New workspace name')
    fireEvent.change(input, { target: { value: 'Trading' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    const list = useWorkspacesStore.getState().workspaces
    expect(list).toHaveLength(1)
    expect(list[0]?.name).toBe('Trading')
    // The input row collapses back to the CTA.
    expect(screen.queryByLabelText('New workspace name')).not.toBeInTheDocument()
  })

  it('Escape cancels the create input without persisting', () => {
    render(<WorkspaceManager />)
    fireEvent.click(screen.getByRole('button', { name: /New workspace/i }))
    const input = screen.getByLabelText('New workspace name')
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
    const list = screen.getByRole('list', { name: /Saved workspaces/i })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.getAttribute('data-workspace-id'))).toEqual(['new', 'mid', 'old'])
  })

  it('marks the active workspace and disables its Activate button', () => {
    useWorkspacesStore.setState({
      workspaces: [
        { id: 'a', name: 'Active',   createdAt: 1, theme: 'dark', density: 'comfy' },
        { id: 'b', name: 'Inactive', createdAt: 2, theme: 'dark', density: 'comfy' },
      ],
      activeId: 'a',
    })
    render(<WorkspaceManager />)
    expect(screen.getByLabelText('Active workspace')).toBeInTheDocument()
    const activeBtn = screen.getByRole('button', { name: /Activate Active/i })
    const inactiveBtn = screen.getByRole('button', { name: /Activate Inactive/i })
    expect(activeBtn).toBeDisabled()
    expect(inactiveBtn).not.toBeDisabled()
  })
})

describe('<WorkspaceManager /> — apply / delete / rename', () => {
  it('clicking Activate writes prefs and flips activeId in the store', () => {
    useWorkspacesStore.setState({
      workspaces: [
        { id: 'a', name: 'Light',  createdAt: 1, theme: 'light', density: 'spacious' },
      ],
      activeId: null,
    })
    render(<WorkspaceManager />)
    fireEvent.click(screen.getByRole('button', { name: /Activate Light/i }))
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
    fireEvent.click(screen.getByRole('button', { name: /Delete Doomed/i }))
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
    fireEvent.click(screen.getByRole('button', { name: /Rename Old/i }))
    const input = screen.getByLabelText('Rename workspace')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useWorkspacesStore.getState().workspaces[0]?.name).toBe('Renamed')

    // Now reopen rename and Escape — should not change.
    fireEvent.click(screen.getByRole('button', { name: /Rename Renamed/i }))
    const input2 = screen.getByLabelText('Rename workspace')
    fireEvent.change(input2, { target: { value: 'Junk' } })
    fireEvent.keyDown(input2, { key: 'Escape' })
    expect(useWorkspacesStore.getState().workspaces[0]?.name).toBe('Renamed')
  })
})


describe("<WorkspaceManager /> — export / import", () => {
  it("hides the share row when no workspaces exist", () => {
    render(<WorkspaceManager />)
    expect(screen.queryByTestId("workspace-share-row")).not.toBeInTheDocument()
  })

  it("shows the share row once a workspace is added", () => {
    useWorkspacesStore.setState({
      workspaces: [{ id: "a", name: "Day", createdAt: 1, theme: "dark", density: "comfy" }],
      activeId: null,
    })
    render(<WorkspaceManager />)
    expect(screen.getByTestId("workspace-share-row")).toBeInTheDocument()
    expect(screen.getByTestId("workspace-export")).toBeInTheDocument()
    expect(screen.getByTestId("workspace-import-input")).toBeInTheDocument()
  })

  it("import success path adds workspaces (real timers + FileReader)", async () => {
    // FileReader needs real microtask ordering — fake timers stub
    // setTimeout but the underlying read still completes asynchronously.
    vi.useRealTimers()
    useWorkspacesStore.setState({
      workspaces: [{ id: "a", name: "existing", createdAt: 1, theme: "dark", density: "comfy" }],
      activeId: null,
    })
    render(<WorkspaceManager />)
    const bundle = JSON.stringify({
      schema: "nexus.workspaces.export",
      version: 1,
      exportedAt: "2026-04-26T00:00:00Z",
      workspaces: [
        { id: "b", name: "imported", createdAt: 2, theme: "light", density: "spacious" },
      ],
    })
    const input = screen.getByTestId("workspace-import-input") as HTMLInputElement
    const file = new File([bundle], "nexus-workspaces.json", { type: "application/json" })
    fireEvent.change(input, { target: { files: [file] } })
    // findBy polls until the success status appears — no timer fakery needed.
    await screen.findByTestId("workspace-import-status")
    expect(useWorkspacesStore.getState().workspaces.map((w) => w.id).sort()).toEqual(["a", "b"])
  })

  it("import failure path surfaces the error message", async () => {
    vi.useRealTimers()
    useWorkspacesStore.setState({
      workspaces: [{ id: "a", name: "existing", createdAt: 1, theme: "dark", density: "comfy" }],
      activeId: null,
    })
    render(<WorkspaceManager />)
    const input = screen.getByTestId("workspace-import-input") as HTMLInputElement
    const file = new File(["{not-json"], "broken.json", { type: "application/json" })
    fireEvent.change(input, { target: { files: [file] } })
    const status = await screen.findByTestId("workspace-import-status")
    expect(status.textContent).toMatch(/invalid json/i)
    // Existing workspace untouched.
    expect(useWorkspacesStore.getState().workspaces).toHaveLength(1)
  })
})
