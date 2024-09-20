<script setup lang="ts">
import { ref, onMounted, type CSSProperties } from 'vue'
import UICard from '@/components/ui/UICard.vue'
import UICardHeader from '@/components/ui/UICardHeader.vue'
import UIModalClose from '@/components/ui/modal/UIModalClose.vue'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import type { Project } from '@/models/project'
import { Runtime } from '@/models/runtime'

const editorCtx = useEditorCtx()

const projectRunnerRef = ref<InstanceType<typeof ProjectRunner>>()

const props = defineProps<{
  project: Project
}>()

const runnerAspectRatio = ref<CSSProperties>({
  aspectRatio: '1/1'
})

const runtime = new Runtime()

const handleConsole = (type: 'log' | 'warn', args: unknown[]) => {
  runtime.addRuntimeLog({ type, args }, props.project.currentFilesHash)
  editorCtx.debugLogList = runtime.runtimeLogs
}

onMounted(() => {
  if (!projectRunnerRef.value) throw new Error('projectRunnerRef is not ready')
  projectRunnerRef.value.run()
})
</script>

<template>
  <UICard class="debug-preview">
    <UICardHeader>
      <div class="header">
        {{ $t({ en: 'Debugging...', zh: '调试中...' }) }}
      </div>
      <UIModalClose class="close" @click="editorCtx.debugProject = false" />
    </UICardHeader>
    <div class="stage-debug-container">
      <ProjectRunner
        v-if="project"
        ref="projectRunnerRef"
        :project="project"
        class="runner"
        :style="runnerAspectRatio"
        @console="handleConsole"
      ></ProjectRunner>
    </div>
  </UICard>
</template>

<style scoped>
.debug-preview {
  height: 419px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  .header {
    flex: 1;
    color: var(--ui-color-title);
  }

  .stage-debug-container {
    display: flex;
    overflow: hidden;
    justify-content: center;
    padding: 12px;
    height: 100%;
    width: 100%;
  }
}

.runner {
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  border-radius: var(--ui-border-radius-1);
}
</style>
