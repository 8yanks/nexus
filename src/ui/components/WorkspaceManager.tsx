// ─── WORKSPACE MANAGER — list / create / activate / delete ──
//
// Embedded in the Options screen under "Workspaces". Lets the user save
// the current theme+density combo under a name, switch between saved
// presets (which writes the prefs and reloads the page), rename an
// existing preset, and delete one.
//
// Phase 1.5 ships theme+density only. The shape of `Workspace` is the
// only thing we need to extend in later phases (e.g. add `auditFilter`
// to the snapshot) — the UI here just iterates the field set.

import { useState } from 'react'
import { Plus, Check, Trash2, Edit3 } from 'lucide-react'
import {
  useWorkspacesStore,
  type Workspace,
} from '@/store/workspaces'
import { loadTheme, loadDensity } from '@/ui/prefs'
import { colors, fonts, radius, btnSecondary, btnSmall } from '@/ui/theme'

// ─── ROW ─────────────────────────────────────────────────────

interface RowProps {
  workspace: Workspace
  isActive: boolean
  onApply: () => void
  onDelete: () => void
  onRename: (next: string) => void
}

const WorkspaceRow = ({
  workspace,
  isActive,
  onApply,
  onDelete,
  onRename,
}: RowProps) => {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(workspace.name)

  const commitRename = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== workspace.name) {
      onRename(trimmed)
    } else {
      setDraft(workspace.name)
    }
    setRenaming(false)
  }

  return (
    <li
      data-workspace-id={workspace.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 12px',
        marginBottom: 6,
        background: isActive ? colors.bgHover : colors.bgInput,
        border: `1px solid ${isActive ? colors.borderLight : colors.border}`,
        borderRadius: radius.input,
      }}
    >
      {/* LEFT — name + meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        {isActive && (
          <Check size={14} style={{ color: colors.green, flexShrink: 0 }} aria-label="Workspace actif" />
        )}
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setDraft(workspace.name)
                setRenaming(false)
              }
            }}
            aria-label="Renommer le workspace"
            style={{
              background: colors.bg,
              border: `1px solid ${colors.borderFocus}`,
              borderRadius: radius.input,
              padding: '3px 8px',
              color: colors.text,
              fontFamily: fonts.sans,
              fontSize: 12,
              width: '100%',
              outline: 'none',
            }}
          />
        ) : (
          <>
            <span style={{ fontSize: 13, color: colors.text, fontWeight: isActive ? 600 : 400 }}>
              {workspace.name}
            </span>
            <span
              style={{
                fontSize: 10,
                color: colors.textMuted,
                fontFamily: fonts.mono,
                whiteSpace: 'nowrap',
              }}
            >
              {workspace.theme} · {workspace.density}
            </span>
          </>
        )}
      </div>

      {/* RIGHT — actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {!renaming && (
          <>
            <button
              type="button"
              onClick={onApply}
              disabled={isActive}
              style={{
                ...btnSmall,
                opacity: isActive ? 0.4 : 1,
                cursor: isActive ? 'default' : 'pointer',
              }}
              aria-label={`Activer ${workspace.name}`}
            >
              {isActive ? 'Actif' : 'Activer'}
            </button>
            <button
              type="button"
              onClick={() => setRenaming(true)}
              style={{ ...btnSmall, padding: '2px 6px' }}
              aria-label={`Renommer ${workspace.name}`}
            >
              <Edit3 size={11} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              style={{
                ...btnSmall,
                padding: '2px 6px',
                color: colors.red,
                borderColor: colors.border,
              }}
              aria-label={`Supprimer ${workspace.name}`}
            >
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>
    </li>
  )
}

// ─── MAIN ────────────────────────────────────────────────────

export const WorkspaceManager = () => {
  const workspaces = useWorkspacesStore((s) => s.workspaces)
  const activeId = useWorkspacesStore((s) => s.activeId)
  const createWorkspace = useWorkspacesStore((s) => s.createWorkspace)
  const renameWorkspace = useWorkspacesStore((s) => s.renameWorkspace)
  const deleteWorkspace = useWorkspacesStore((s) => s.deleteWorkspace)
  const applyWorkspace = useWorkspacesStore((s) => s.applyWorkspace)

  const [creating, setCreating] = useState(false)
  const [draftName, setDraftName] = useState('')

  const commitCreate = () => {
    const name = draftName.trim()
    if (name) {
      createWorkspace(name, {
        theme: loadTheme(),
        density: loadDensity(),
      })
    }
    setDraftName('')
    setCreating(false)
  }

  return (
    <div>
      {/* List */}
      {workspaces.length === 0 ? (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: radius.input,
            background: colors.bg,
            border: `1px dashed ${colors.border}`,
            fontSize: 12,
            color: colors.textMuted,
            fontFamily: fonts.sans,
            lineHeight: 1.5,
          }}
        >
          Aucun workspace enregistré. Créez-en un pour sauvegarder votre
          combinaison thème + densité actuelle et y revenir en un clic.
        </div>
      ) : (
        <ul
          style={{ margin: 0, padding: 0, listStyle: 'none' }}
          aria-label="Workspaces enregistrés"
        >
          {[...workspaces]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((w) => (
              <WorkspaceRow
                key={w.id}
                workspace={w}
                isActive={w.id === activeId}
                onApply={() => applyWorkspace(w.id)}
                onDelete={() => deleteWorkspace(w.id)}
                onRename={(name) => renameWorkspace(w.id, name)}
              />
            ))}
        </ul>
      )}

      {/* Create row */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        {creating ? (
          <>
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate()
                if (e.key === 'Escape') {
                  setDraftName('')
                  setCreating(false)
                }
              }}
              placeholder="Nom du workspace…"
              aria-label="Nom du nouveau workspace"
              style={{
                flex: 1,
                background: colors.bgInput,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.input,
                padding: '6px 10px',
                color: colors.text,
                fontFamily: fonts.sans,
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button type="button" style={btnSecondary} onClick={commitCreate}>
              Créer
            </button>
            <button
              type="button"
              style={btnSecondary}
              onClick={() => {
                setDraftName('')
                setCreating(false)
              }}
            >
              Annuler
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            style={{
              ...btnSecondary,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={13} />
            Nouveau workspace
          </button>
        )}
      </div>
    </div>
  )
}
