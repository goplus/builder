<script setup lang="ts">
import { ref, watch } from 'vue'
import { untilNotNull } from '@/utils/utils'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { RuntimeOutputKind, type RuntimeOutput } from '@/models/runtime'
import { getCleanupSignal } from '@/utils/disposable'

const props = defineProps<{
  visible: boolean
}>()

const editorCtx = useEditorCtx()
const projectRunnerRef = ref<InstanceType<typeof ProjectRunner>>()
const lastPanicOutput = ref<RuntimeOutput | null>(null)

function handleConsole(type: 'log' | 'warn', args: unknown[]) {
  if (type === 'log' && args.length === 1 && typeof args[0] === 'string') {
    try {
      const logMsg = JSON.parse(args[0])

      // Handle info messages.
      if (logMsg.level === 'INFO') {
        // Log format is determined by `github.com/goplus/builder/tools/ispx/main.go:logWithCallerInfo`.
        //
        // Example:
        //   {
        //     "time": "2006-01-02T15:04:05Z07:00",
        //     "level": "INFO",
        //     "msg": "Hello, world!\n",
        //     "function": "main.(*MySprite).Main.func1",
        //     "file": "MySprite.spx",
        //     "line": 2
        //   }
        editorCtx.runtime.addOutput({
          kind: RuntimeOutputKind.Log,
          time: logMsg.time,
          message: logMsg.msg,
          source: {
            textDocument: {
              uri: `file:///${logMsg.file}`
            },
            range: {
              start: { line: logMsg.line, column: 1 },
              end: { line: logMsg.line, column: 1 }
            }
          }
        })
        return
      }

      // Handle panic messages.
      if (logMsg.level === 'ERROR' && logMsg.error && logMsg.msg === 'panic') {
        // Log format is determined by `github.com/goplus/builder/tools/ispx/main.go:logWithPanicInfo`.
        //
        // Example:
        //   {
        //     "time": "2006-01-02T15:04:05Z07:00",
        //     "level": "ERROR",
        //     "msg": "captured panic",
        //     "error": "runtime error: index out of range [0] with length 0",
        //     "function": "main.(*MySprite).Main.func1",
        //     "file": "MySprite.spx",
        //     "line": 3,
        //     "column": 18
        //   }
        lastPanicOutput.value = {
          kind: RuntimeOutputKind.Error,
          time: logMsg.time,
          message: `panic: ${logMsg.error}`,
          source: {
            textDocument: {
              uri: `file:///${logMsg.file}`
            },
            range: {
              start: { line: logMsg.line, column: logMsg.column },
              end: { line: logMsg.line, column: logMsg.column }
            }
          }
        }
        return
      }
    } catch {
      // If parsing fails, fall through to default handling.
    }
  }

  const message = args.join(' ')
  if (/^panic: .+ \[recovered\]$/.test(message)) return

  if (
    type === 'log' &&
    lastPanicOutput.value != null &&
    (message === lastPanicOutput.value.message || message === '\t' + lastPanicOutput.value.message)
  ) {
    editorCtx.runtime.addOutput(lastPanicOutput.value)
    lastPanicOutput.value = null
  } else {
    editorCtx.runtime.addOutput({
      kind: type === 'warn' ? RuntimeOutputKind.Error : RuntimeOutputKind.Log,
      time: Date.now(),
      message
    })
  }
}

watch(
  () => props.visible,
  async (visible, _, onCleanup) => {
    if (!visible) return

    const signal = getCleanupSignal(onCleanup)
    const projectRunner = await untilNotNull(projectRunnerRef)
    signal.throwIfAborted()
    editorCtx.runtime.clearOutputs()
    projectRunner.run().then((filesHash) => {
      editorCtx.runtime.setRunning({ mode: 'debug', initializing: false }, filesHash)
    })
    signal.addEventListener('abort', () => {
      projectRunner.stop()
    })
  },
  { immediate: true }
)

defineExpose({
  async rerun() {
    editorCtx.runtime.setRunning({ mode: 'debug', initializing: true })
    const projectRunner = await untilNotNull(projectRunnerRef)
    editorCtx.runtime.clearOutputs()
    const filesHash = await projectRunner.rerun()
    editorCtx.runtime.setRunning({ mode: 'debug', initializing: false }, filesHash)
  }
})
</script>

<template>
  <ProjectRunner ref="projectRunnerRef" :project="editorCtx.project" @console="handleConsole" />
</template>

<style lang="scss" scoped></style>
