import { watch } from 'vue'
import { debounce } from 'lodash'
import type { LocaleMessage } from '@/utils/i18n'
import type { Disposer } from '@/utils/disposable'
import type { Copilot } from '@/components/copilot/copilot'
import { DiagnosticSeverity } from '@/components/editor/spx-code-editor'
import { RuntimeOutputKind } from '@/components/editor/runtime'
import type { CodeEditor } from '@/components/editor/spx-code-editor'
import type { EditorCtx } from '../EditorContextProvider.vue'

/** Debounce for code-change events, so typing/dragging produces one event, not one per keystroke. */
const codeChangeDebounce = 1500

function notify(copilot: Copilot, name: LocaleMessage, detail: string) {
  // These are ambient signals, not user requests, so never pop the panel open for them.
  copilot.notifyUserEvent(name, detail, { autoOpen: false })
}

/** Notify the copilot of the user's editor actions, so it can perceive their progress. */
export function setupUserEventNotifications(editorCtx: EditorCtx, codeEditor: CodeEditor, copilot: Copilot): Disposer {
  const disposers: Disposer[] = []

  disposers.push(watchRun(editorCtx, copilot))
  disposers.push(watchRuntimeExit(editorCtx, copilot))
  disposers.push(watchRuntimeErrors(editorCtx, copilot))
  disposers.push(watchCodeChange(editorCtx, copilot))
  disposers.push(watchDiagnostics(editorCtx, codeEditor, copilot))
  disposers.push(watchSelection(editorCtx, copilot))

  return () => disposers.forEach((d) => d())
}

/** A: run started / stopped / failed to start, from the runtime's running-state transitions. */
function watchRun(editorCtx: EditorCtx, copilot: Copilot): Disposer {
  return watch(
    () => editorCtx.state.runtime.running,
    (running, prev) => {
      if (running.mode === 'debug' && prev?.mode !== 'debug') {
        notify(copilot, { en: 'Project run started', zh: '开始运行项目' }, 'The user started running the project.')
        return
      }
      if (running.mode === 'debug' && running.initializingError != null) {
        notify(
          copilot,
          { en: 'Project failed to run', zh: '项目运行失败' },
          `The project failed to start running: ${String(running.initializingError)}`
        )
        return
      }
      if (running.mode === 'none' && prev?.mode === 'debug') {
        notify(copilot, { en: 'Project run stopped', zh: '停止运行项目' }, 'The user stopped running the project.')
      }
    }
  )
}

/** A: game exited (both normal and abnormal — the previous wiring only reported code 0). */
function watchRuntimeExit(editorCtx: EditorCtx, copilot: Copilot): Disposer {
  return watch(
    () => editorCtx.state.runtime,
    (runtime, _, onCleanup) => {
      const unlisten = runtime.on('didExit', (code) => {
        if (code === 0) {
          notify(copilot, { en: 'Game exited normally', zh: '游戏正常退出' }, 'The game exited with code 0.')
        } else {
          notify(
            copilot,
            { en: 'Game exited with error', zh: '游戏异常退出' },
            `The game exited with code ${code} (an error or crash).`
          )
        }
      })
      onCleanup(unlisten)
    },
    { immediate: true }
  )
}

/** A: a new runtime error output appeared (the game ran but reported an error / panic). */
function watchRuntimeErrors(editorCtx: EditorCtx, copilot: Copilot): Disposer {
  let lastErrorId = -1
  const emit = debounce((message: string) => {
    notify(copilot, { en: 'Runtime error', zh: '运行时报错' }, `The running game reported an error: ${message}`)
  }, codeChangeDebounce)
  const stop = watch(
    () => editorCtx.state.runtime.outputs,
    (outputs) => {
      const errors = outputs.filter((o) => o.kind === RuntimeOutputKind.Error && o.id > lastErrorId)
      if (errors.length === 0) return
      lastErrorId = outputs[outputs.length - 1].id
      emit(errors[errors.length - 1].message)
    }
  )
  return () => {
    emit.cancel()
    stop()
  }
}

/** B: the project code changed (debounced), i.e. the user is writing/editing code. */
function watchCodeChange(editorCtx: EditorCtx, copilot: Copilot): Disposer {
  const emit = debounce(() => {
    notify(copilot, { en: 'Code changed', zh: '代码变更' }, 'The user edited the project code.')
  }, codeChangeDebounce)
  const stop = watch(
    // Concatenate all code so any edit (sprite or stage) triggers the watcher.
    () => [editorCtx.project.stage.code, ...editorCtx.project.sprites.map((s) => s.code)].join('\n'),
    () => emit()
  )
  return () => {
    emit.cancel()
    stop()
  }
}

/** B: code diagnostics appeared or cleared (a code error surfaced or was fixed). */
function watchDiagnostics(editorCtx: EditorCtx, codeEditor: CodeEditor, copilot: Copilot): Disposer {
  let hadError = false
  // The first check establishes the baseline (e.g. a course that starts with broken code) without
  // reporting it as a change, so course start does not emit a spurious "code has errors" event.
  let baselineEstablished = false
  const check = debounce(async () => {
    let hasError = false
    try {
      const report = await codeEditor.diagnosticWorkspace()
      hasError = report.items.some((item) => item.diagnostics.some((d) => d.severity === DiagnosticSeverity.Error))
    } catch {
      return
    }
    if (!baselineEstablished) {
      baselineEstablished = true
      hadError = hasError
      return
    }
    if (hasError === hadError) return
    hadError = hasError
    if (hasError) {
      notify(copilot, { en: 'Code has errors', zh: '代码存在错误' }, 'The project code now has error diagnostics.')
    } else {
      notify(
        copilot,
        { en: 'Code errors cleared', zh: '代码错误已消除' },
        'The project code no longer has error diagnostics.'
      )
    }
  }, codeChangeDebounce)
  const stop = watch(
    () => editorCtx.state.runtime.outputs,
    () => check(),
    { immediate: true }
  )
  const stopCode = watch(
    () => [editorCtx.project.stage.code, ...editorCtx.project.sprites.map((s) => s.code)].join('\n'),
    () => check()
  )
  return () => {
    check.cancel()
    stop()
    stopCode()
  }
}

/** C: the user switched the selected sprite / stage, or the sprite editing tab. */
function watchSelection(editorCtx: EditorCtx, copilot: Copilot): Disposer {
  const stopTarget = watch(
    () => {
      const selected = editorCtx.state.selected
      if (selected.type === 'stage') return 'stage'
      return `sprite:${selected.sprite?.name ?? ''}`
    },
    (target, prev) => {
      if (prev == null) return
      const label = target === 'stage' ? 'the stage' : `sprite "${target.slice('sprite:'.length)}"`
      notify(copilot, { en: 'Selection changed', zh: '选中项变更' }, `The user selected ${label}.`)
    }
  )
  const stopTab = watch(
    () => {
      const selected = editorCtx.state.selected
      return selected.type === 'sprite' ? selected.spriteSelected?.type ?? null : null
    },
    (tab, prev) => {
      if (tab == null || prev == null) return
      notify(copilot, { en: 'Editor tab changed', zh: '编辑器标签切换' }, `The user switched to the "${tab}" tab.`)
    }
  )
  return () => {
    stopTarget()
    stopTab()
  }
}
