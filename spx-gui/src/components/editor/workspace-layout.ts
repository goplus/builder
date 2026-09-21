import { shallowRef } from 'vue'

/**
 * Layout mode of the editor workspace.
 * - `default`: the regular editor layout.
 * - `focused`: a distraction-reduced layout for guided scenarios (e.g. tutorial courses): the
 *   game preview takes a larger share of the workspace, run controls float at the corner of
 *   the preview, and code is rendered with a larger font.
 */
export type WorkspaceLayoutMode = 'default' | 'focused'

/**
 * Areas of the editor workspace that can be hidden to reduce distraction.
 * - `editor-panels`: the sprites / sounds / stage panels below the game preview.
 * - `edit-mode-switch`: the editor-mode (default / map) switcher in the navbar.
 * - `preview-header`: the header bar of the game preview (title, publish entry, etc.).
 * - `code-editor-tools`: the tools beside the code editor (document tabs & zoom control).
 */
export const hideableWorkspaceAreas = [
  'editor-panels',
  'edit-mode-switch',
  'preview-header',
  'code-editor-tools'
] as const

export type WorkspaceArea = (typeof hideableWorkspaceAreas)[number]

export function isWorkspaceArea(value: string): value is WorkspaceArea {
  return (hideableWorkspaceAreas as readonly string[]).includes(value)
}

/**
 * Tools that are absent from the regular editor and can be surfaced for guided scenarios.
 * - `ruler`: measure the distance between things on the stage.
 */
export const optionalWorkspaceTools = ['ruler'] as const

export type WorkspaceTool = (typeof optionalWorkspaceTools)[number]

/** Font size (px) for code in the `focused` layout. The default font size is kept user-adjustable instead. */
const focusedCodeFontSize = 20

/**
 * Controls the editor workspace layout.
 *
 * This is an editor-owned extension point: other features (e.g. tutorials) can adjust the
 * workspace — switch to the focused layout, or hide areas that would distract from a guided
 * task — without the editor depending on them. The editor only exposes generic capabilities
 * here and stays ignorant of who is driving it.
 */
class EditorWorkspaceLayout {
  private modeRef = shallowRef<WorkspaceLayoutMode>('default')
  get mode() {
    return this.modeRef.value
  }
  setMode(mode: WorkspaceLayoutMode) {
    this.modeRef.value = mode
  }

  private hiddenAreasRef = shallowRef<ReadonlySet<WorkspaceArea>>(new Set())
  get hiddenAreas() {
    return this.hiddenAreasRef.value
  }
  isHidden(area: WorkspaceArea) {
    return this.hiddenAreasRef.value.has(area)
  }
  setHiddenAreas(areas: WorkspaceArea[]) {
    this.hiddenAreasRef.value = new Set(areas)
  }

  private enabledToolsRef = shallowRef<ReadonlySet<WorkspaceTool>>(new Set())
  get enabledTools() {
    return this.enabledToolsRef.value
  }
  isToolEnabled(tool: WorkspaceTool) {
    return this.enabledToolsRef.value.has(tool)
  }
  setEnabledTools(tools: WorkspaceTool[]) {
    this.enabledToolsRef.value = new Set(tools)
  }

  /** Fixed code font size (px) for the current mode, or `null` to keep the user-adjustable font size. */
  get codeFontSize(): number | null {
    return this.mode === 'focused' ? focusedCodeFontSize : null
  }

  reset() {
    this.modeRef.value = 'default'
    this.hiddenAreasRef.value = new Set()
    this.enabledToolsRef.value = new Set()
  }
}

// App-level single instance: drivers (e.g. the tutorial, copilot-rendered elements) live outside
// the editor component tree, so they reach it by import rather than provide/inject. See also
// `editorLeaveConfirm` in `./leave-confirm.ts`.
export const editorWorkspaceLayout = new EditorWorkspaceLayout()
