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
        <UIButton class="button" type="boring" icon="share" @click="handlePublish">
          {{ $t({ en: 'Publish', zh: '发布' }) }}
        </UIButton>
        <UIModalClose class="close" @click="emit('close')" />
      </div>
    </div>
    <div :class="['main', displayMode, { expanded }]">
      <div class="runner-container">
        <div class="wrapper" :style="runnerAspectRatio">
          <ProjectRunner
            ref="projectRunnerRef"
            :project="project"
            :style="runnerAspectRatio"
            class="runner"
            @console="handleConsole"
          />
        </div>
      </div>
      <div class="console-container">
        <div class="console-header">
          <div>Console</div>
          <button class="expand-icon" @click="expanded = !expanded">
            <UIIcon type="arrowAlt" />
          </button>
        </div>
        <div class="console">
          <div class="spacer"></div>
          <div v-for="{ id, time, message, type } in consoleMessages" :key="id" :class="`message message-${type}`">
            <span class="time">{{ time }}</span>
            <pre class="content">{{ message }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type CSSProperties, watch } from 'vue'
import dayjs from 'dayjs'
import { untilNotNull } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import type { Project } from '@/models/project'
import { UIButton, UIIcon, UIModalClose } from '@/components/ui'
import { usePublishProject } from '@/components/project'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'

const props = defineProps<{
  project: Project
  visible: boolean
}>()

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
  () => props.visible,
  async (visible, _, onCleanup) => {
    if (!visible) return

    const mapSize = props.project.stage.getMapSize()
    runnerAspectRatio.value.aspectRatio = `${mapSize.width}/${mapSize.height}`
    displayMode.value = mapSize.width > mapSize.height ? 'landscape' : 'portrait'

    const projectRunner = await untilNotNull(projectRunnerRef)
    consoleMessages.value = []
    projectRunner.run()
    onCleanup(() => {
      projectRunner.stop()
    })
  },
  { immediate: true }
)

const handleConsole = (type: 'log' | 'warn', args: any[]) => {
  const time = dayjs().format('HH:mm:ss.SSS')
  const message = args.join(' ')
  consoleMessages.value.unshift({ id: nextId.value++, time, message, type })
}

const handleRerun = () => {
  projectRunnerRef.value?.rerun()
  consoleMessages.value = []
}

const publishProject = usePublishProject()
const handlePublish = useMessageHandle(() => publishProject(props.project), {
  en: 'Failed to publish project',
  zh: '发布项目失败'
}).fn
</script>
<style lang="scss" scoped>
button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

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

.runner-container {
  overflow: hidden;
  flex: 1;
  display: flex;
  justify-content: center;
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
  padding: var(--ui-gap-middle);
  flex-direction: column-reverse;
  display: flex;
  .message {
    display: flex;
    gap: var(--ui-gap-middle);
    font-family: var(--ui-font-family-code);
    .time {
      flex: 0 0 auto;
      opacity: 0.5;
    }
    .content {
      flex: 1 1 0;
      text-wrap: wrap;
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
    border-top: none;
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
.spacer {
  flex: 1;
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
  gap: 8px;
  position: relative;
  color: var(--ui-color-title);
}
</style>
