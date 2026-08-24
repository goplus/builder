/**
 * Editor-owned bridge for runtime output lines, so features outside the editor component tree can
 * observe them. The App-level tutorial lives above the editor's `editorCtx` provider and cannot
 * read `runtime.outputs` directly; it subscribes here to watch for its course-completion sentinel.
 *
 * The editor pushes each fresh line; features subscribe. The editor stays ignorant of who listens
 * or what they look for — same one-way shape as `editorWorkspaceLayout` and `editorLeaveConfirm`.
 */
class EditorRuntimeOutputBridge {
  private listeners = new Set<(line: string) => void>()
  private runStartListeners = new Set<() => void>()

  /** Subscribe to fresh runtime output lines. Returns a disposer. */
  onLine(listener: (line: string) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Subscribe to run starts, so per-run bookkeeping (e.g. completion counting) can reset. */
  onRunStart(listener: () => void): () => void {
    this.runStartListeners.add(listener)
    return () => {
      this.runStartListeners.delete(listener)
    }
  }

  push(line: string) {
    for (const listener of this.listeners) listener(line)
  }

  pushRunStart() {
    for (const listener of this.runStartListeners) listener()
  }
}

// App-level single instance: the editor pushes by import (it runs inside the editor tree), and
// features subscribe by import (they may live outside it). See also `editorWorkspaceLayout`.
export const editorRuntimeOutputBridge = new EditorRuntimeOutputBridge()
