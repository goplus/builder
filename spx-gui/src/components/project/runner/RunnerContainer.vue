<template>
  <div class="container">
    <div class="header">
      <div>
        {{ project?.name }}
      </div>
      <UITooltip placement="bottom">
        <template #trigger>
          <button>
            <UIIcon type="rotate" @click="handleRerun" />
          </button>
        </template>
        {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
      </UITooltip>
      <UITooltip placement="bottom">
        <template #trigger>
          <button>
            <UIIcon type="share" @click="handleShare" />
          </button>
        </template>
        {{ $t({ en: 'Share', zh: '分享' }) }}
      </UITooltip>
      <UIModalClose v-if="mode === 'debug'" class="close" @click="emit('close')" />
    </div>
    <div :class="['main', displayMode, { expanded }]">
      <div class="runner-container">
        <div class="wrapper" :style="runnerAspectRatio">
          <ProjectRunner
            v-if="project"
            ref="projectRunnerRef"
            :project="project"
            :style="runnerAspectRatio"
            class="runner"
            @console="handleConsole"
          />
        </div>
      </div>
      <div v-if="mode === 'debug'" class="console-container">
        <div class="console-header">
          <div>Console</div>
          <button class="expand-icon" @click="expanded = !expanded">
            <UIIcon type="arrowAlt" />
          </button>
        </div>
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
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, type CSSProperties, watch, nextTick } from 'vue'
import dayjs from 'dayjs'
import type { Project } from '@/models/project'
import ProjectRunner from './ProjectRunner.vue'
import { useSaveAndShareProject, useShareProject } from '@/components/project'
import { UIIcon, UIModalClose, UITooltip } from '@/components/ui'

const props = defineProps<{ project: Project; mode: 'debug' | 'share' }>()
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

const runnerAspectRatio = ref<CSSProperties>({
  aspectRatio: '1/1'
})
const displayMode = ref<'landscape' | 'portrait'>('landscape')
const expanded = ref(false)

watch(
  () => props.project,
  async (newProject) => {
    const mapSize = await newProject.stage.getMapSize()

    runnerAspectRatio.value.aspectRatio = `${mapSize.width}/${mapSize.height}`
    displayMode.value = mapSize.width > mapSize.height ? 'landscape' : 'portrait'
    consoleMessages.value = []

    // Wait for the project to be injected into the component
    await nextTick()

    handleRerun()
  },
  { immediate: true }
)

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

const saveAndShareProject = useSaveAndShareProject()
const shareProject = useShareProject()
const handleShare = () => {
  if (props.mode === 'debug') {
    saveAndShareProject(props.project)
  } else {
    shareProject(props.project)
  }
}
</script>
<style lang="scss" scoped>
button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.header button > .ui-icon {
  width: 24px;
  height: 24px;
  color: var(--ui-color-primary-500);
}

.close {
  position: absolute;
  right: 20px;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
  font-size: 16px;
  font-weight: 500;
  border-bottom: 1px solid var(--ui-color-grey-400);
  height: 56px;
  position: relative;
  color: var(--ui-color-title);
}

.runner-container {
  overflow: hidden;
  flex: 1;
  display: flex;
  justify-content: center;
  border: 1px solid var(--ui-color-grey-400);
  background-color: var(--ui-color-grey-300);
  padding: 20px;
}

.wrapper {
  height: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
}

.runner {
  width: 100%;
  max-height: 100%;
}

.main {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: 100%;

  &.landscape {
    flex-direction: column;
  }
}

.console {
  padding-top: 8px;
  flex-direction: column-reverse;
  display: flex;
  .message {
    font-family: monospace;
    font-size: smaller;
    white-space: nowrap;
    .time {
      opacity: 0.5;
      padding-left: 0.5em;
      padding-right: 0.5em;
    }
  }
  .message-warn {
    color: #ffb039;
  }
  overflow-y: auto;
  overflow-x: hidden;
}

.expanded {
  .console {
    overflow-y: auto;
  }
}

.portrait {
  .console-container {
    border-bottom: 1px solid var(--ui-color-grey-400);
    border-right: none;
  }

  .console {
    width: 320px;
  }

  .expand-icon {
    transform: rotate(-90deg);
    position: absolute;
    left: 16px;
  }
}

.expanded.portrait {
  .console {
    width: calc(50vw - 24px);
  }

  .expand-icon {
    transform: rotate(90deg);
  }
}

.landscape {
  .console {
    height: 100px;
  }

  .expand-icon {
    transform: rotate(0deg);
  }
}

.expanded.landscape {
  .console {
    height: 40vh;
  }

  .expand-icon {
    transform: rotate(180deg);
  }
}

.console-container {
  border: 1px solid var(--ui-color-grey-400);
  border-bottom: none;

  display: flex;
  flex-direction: column;
}

.console-header {
  min-height: 44px;
  background-color: var(--ui-color-grey-300);
  border-bottom: 1px solid var(--ui-color-grey-400);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
  gap: 8px;
  position: relative;
  color: var(--ui-color-title);
}
</style>
