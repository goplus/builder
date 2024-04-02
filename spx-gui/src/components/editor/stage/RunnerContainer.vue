<template>
  <div class="container">
    <div class="header">
      <n-button>Share</n-button>
      <n-button type="success" @click="handleRerun"> Rerun (TODO: i18n) </n-button>
      <n-button type="error" @click="handleClose"> Close </n-button>
    </div>
    <ProjectRunner
      ref="projectRunnerRef"
      :project="project"
      class="runner"
      @console="handleConsole"
    />
    <div class="console">
      <div
        v-for="{ id, time, message, type } in consoleMessages"
        :key="id"
        :class="`message message-${type}`"
      >
        <span class="time">{{ time }}</span>
        <span>{{ message }}</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import type { Project } from '@/models/project'
import { NButton } from 'naive-ui'
import ProjectRunner from '@/components/project-runner/ProjectRunner.vue'

defineProps<{ project: Project }>()
const emit = defineEmits<{
  close: []
}>()

const projectRunnerRef = ref<InstanceType<typeof ProjectRunner>>()

const consoleMessages = ref<
  {
    id: number
    time: string
    message: string
    type: 'log' | 'warn'
  }[]
>([])
const nextId = ref(0)

const handleConsole = (type: 'log' | 'warn', args: any[]) => {
  const time = dayjs().format('HH:mm:ss.SSS')
  const message = args.join(' ')
  consoleMessages.value.unshift({ id: nextId.value++, time, message, type })
}

onMounted(() => {
  if (!projectRunnerRef.value) throw new Error('projectRunnerRef is not ready')
  projectRunnerRef.value.run()
})

const handleRerun = () => {
  projectRunnerRef.value?.stop()
  projectRunnerRef.value?.run()
  consoleMessages.value = []
}

const handleClose = () => {
  emit('close')
}
</script>
<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
}
.header {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.runner {
  flex: 3;
}
.console {
  padding-top: 8px;
  flex: 1;
  width: 100%;
  overflow: auto;
  flex-direction: column-reverse;
  display: flex;
  .message {
    font-family: monospace;
    font-size: smaller;
    .time {
      opacity: 0.5;
      padding-left: 0.5em;
      padding-right: 0.5em;
    }
  }
  .message-warn {
    color: #ffb039;
  }
}
</style>
