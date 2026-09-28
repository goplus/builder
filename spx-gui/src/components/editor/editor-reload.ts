import { shallowRef } from 'vue'

/**
 * Lets features request a reload of the editor page's project state.
 *
 * This is an editor-owned extension point: other features (e.g. tutorials, for restarting a
 * course) can ask the editor to rebuild its state and reload the project from the cloud —
 * dropping in-memory edits of an effect-free editing session — without the editor depending
 * on them. The editor page watches `counter` and reloads on change; requests made while no
 * editor page is mounted are ignored.
 */
class EditorReload {
  private counterRef = shallowRef(0)
  /** Number of reload requests so far. The editor page watches this and reloads on change. */
  get counter() {
    return this.counterRef.value
  }
  request() {
    this.counterRef.value++
  }
}

// App-level single instance: drivers live outside the editor component tree, so they reach it
// by import rather than provide/inject. See also `editorLeaveConfirm` in `./leave-confirm.ts`.
export const editorReload = new EditorReload()
