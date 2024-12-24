<template>
  <div class="container">
    <div class="header">
      <div class="header-left"></div>
      <div class="project-name">
        {{ project.name }}
      </div>
      <div class="header-right">
        <UIButton class="button" icon="rotate" @click="handleRerun">
          {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
        </UIButton>
        <!-- TODO: support "stop", which preserves the last frame -->
        <UIModalClose class="close" @click="emit('close')" />
      </div>
    </div>
    <div class="main">
      <ProjectRunner ref="projectRunnerRef" class="runner" :project="project" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { untilNotNull } from '@/utils/utils'
import type { Project } from '@/models/project'
import { UIButton, UIModalClose } from '@/components/ui'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'

const props = defineProps<{
  project: Project
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const projectRunnerRef = ref<InstanceType<typeof ProjectRunner>>()

watch(
  () => props.visible,
  async (visible, _, onCleanup) => {
    if (!visible) return

    const projectRunner = await untilNotNull(projectRunnerRef)
    projectRunner.run()
    onCleanup(() => {
      projectRunner.stop()
    })
  },
  { immediate: true }
)

const handleRerun = () => {
  projectRunnerRef.value?.rerun()
}
</script>
<style lang="scss" scoped>
.close {
  transform: scale(1.2);
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 32px;
  font-size: 16px;
  border-bottom: 1px solid var(--ui-color-grey-400);
  height: 56px;
  color: var(--ui-color-title);
}

.header-left {
  flex: 1;
  flex-basis: 30%;
}

.project-name {
  flex: 1;
  flex-basis: 40%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-right {
  flex: 1;
  flex-basis: 30%;
  display: flex;
  gap: 20px;
  justify-content: flex-end;
  align-items: center;
  padding-right: 20px;
}

.main {
  padding: 20px;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: grid;
  justify-content: center;
  background-color: var(--ui-color-grey-300);
}

.runner {
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
}
</style>
