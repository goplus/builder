<script setup lang="ts">
import { onMounted, ref } from 'vue'
import UICard from '@/components/ui/UICard.vue'
import UIModalClose from '@/components/ui/modal/UIModalClose.vue'
import type { Project } from '@/models/project'
import UICardHeader from '@/components/ui/UICardHeader.vue'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { Runtime, type RuntimeError } from '@/models/runtime'

const projectRunnerRef = ref<InstanceType<typeof ProjectRunner>>()

const editorCtx = useEditorCtx()

const runTime = new Runtime()

const props = defineProps<{
  project: Project
}>()

onMounted(() => {
  if (!projectRunnerRef.value) throw new Error('projectRunnerRef is not ready')
  projectRunnerRef.value.run()
})

const runtimeErrors = ref<RuntimeError[]>([])

const handleConsole = (type: 'log' | 'warn', args: unknown[]) => {
  runTime.addRuntimeLog({ type, args }, props.project.currentFilesHash)
  runtimeErrors.value = runTime.runtimeErrors
  editorCtx.debugErrorList = runTime.runtimeErrors
}
</script>

<template>
  <div class="debug-panels">
    <UICard class="main">
      <UICardHeader>
        <div class="header">
          {{ $t({ en: 'Console', zh: '日志信息' }) }}
        </div>
        <UIModalClose class="close" @click="editorCtx.debugProject = false" />
      </UICardHeader>
      <div class="hidden-runner">
        <ProjectRunner
          v-if="project"
          ref="projectRunnerRef"
          :project="project"
          @console="handleConsole"
        ></ProjectRunner>
      </div>
      <div class="console">
        <div v-for="message in runtimeErrors" :key="message.message" class="message">
          <span class="fileUri">{{
            $t({ en: 'file:', zh: '文件:' }) + message.position.fileUri
          }}</span>
          <span class="line">{{ $t({ en: 'line:', zh: '行:' }) + message.position.line }}</span>
          <span class="column">{{
            $t({ en: 'column:', zh: '列:' }) + message.position.column
          }}</span>
          <br />
          <span class="msg">{{ $t({ en: 'message:', zh: '信息:' }) + message.message }}</span>
        </div>
      </div>
    </UICard>
  </div>
</template>

<style scoped lang="scss">
.debug-panels {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.main {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;

  .header {
    flex: 1;
    color: var(--ui-color-title);
  }
}

.hidden-runner {
  width: 0;
  height: 0;
  overflow: hidden;
}

.close {
  transform: scale(1.2);
}

.console {
  padding: 8px;
  overflow: auto;
}

.message {
  padding: 6px;
  border-radius: 8px;
  transition: 0.3s;
  margin-bottom: 8px;
  &:hover {
    background-color: var(--ui-color-grey-300);
  }
}

.fileUri {
  margin: 0 2px;
}

.line {
  margin: 0 2px;
}

.column {
  margin: 0 2px;
}

.msg {
  margin: 0 2px;
}
</style>
