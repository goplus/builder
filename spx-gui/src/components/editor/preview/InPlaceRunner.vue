<script setup lang="ts">
import { ref, watch } from 'vue'
import { untilNotNull } from '@/utils/utils'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { RuntimeOutputKind } from '@/models/runtime'
import { getCleanupSignal } from '@/utils/disposable'

const props = defineProps<{
  visible: boolean
}>()

const editorCtx = useEditorCtx()
const projectRunnerRef = ref<InstanceType<typeof ProjectRunner>>()

function handleConsole(type: 'log' | 'warn', args: unknown[]) {
  // TODO: parse source
  editorCtx.runtime.addOutput({
    kind: type === 'warn' ? RuntimeOutputKind.Error : RuntimeOutputKind.Log,
    time: Date.now(),
    message: args.join(' ')
  })
}

watch(
  () => props.visible,
  async (visible, _, onCleanup) => {
    if (!visible) return

    const signal = getCleanupSignal(onCleanup)
    const projectRunner = await untilNotNull(projectRunnerRef)
    signal.throwIfAborted()
    editorCtx.runtime.clearOutputs()
    projectRunner.run().then(() => {
      editorCtx.runtime.setRunning({ mode: 'debug', initializing: false })
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
    await projectRunner.rerun()
    editorCtx.runtime.setRunning({ mode: 'debug', initializing: false })
  }
})
</script>

<template>
  <ProjectRunner ref="projectRunnerRef" :project="editorCtx.project" @console="handleConsole" />
</template>

<style lang="scss" scoped></style>
