import { shallowRef } from 'vue'

/**
 * Gates whether the copilot's in-editor code guides (code-drag-hint / code-type-hint /
 * code-change-hint / code-delete-hint) are available.
 *
 * This is an editor-owned extension point: features (e.g. tutorials, which withhold code
 * guidance until the user is stuck enough) can turn the guides off so the copilot cannot even
 * emit them, without the editor depending on those features. Disabling unregisters the elements,
 * so the copilot does not see them as options — a hard boundary, not a prompt suggestion.
 *
 * Enabled by default (the regular editor copilot offers code guides freely).
 */
class CodeGuidesGate {
  private enabledRef = shallowRef(true)
  get enabled() {
    return this.enabledRef.value
  }
  setEnabled(enabled: boolean) {
    this.enabledRef.value = enabled
  }
  reset() {
    this.enabledRef.value = true
  }
}

// App-level single instance: drivers live outside the editor component tree, so they reach it by
// import rather than provide/inject. See also `editorWorkspaceLayout` in `../workspace-layout.ts`.
export const editorCopilotCodeGuides = new CodeGuidesGate()
