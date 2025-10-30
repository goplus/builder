<script lang="ts">
import { throttle } from 'lodash'
import { onMounted, onUnmounted, ref } from 'vue'
import { ProgressCollector, type Progress } from '@/utils/progress'
import { useFileUrl } from '@/utils/file'
import { registerPlayer } from '@/utils/player-registry'
import { hashFiles } from '@/models/common/hash'
import type { Project } from '@/models/project'
import { UIImg, UIDetailedLoading } from '@/components/ui'
import { apiBaseUrl } from '@/utils/env'
import { ensureAccessToken } from '@/stores/user'
import { isProjectUsingAIInteraction } from '@/utils/project'
import { Cancelled } from '@/utils/exception/base'
import RunningError from './common/RunningError.vue'
import { zip } from './common/common'

/** APIs exposed by the spx-gui-desktop */
interface SpxGuiDesktop {
  setAIInteractionAPIEndpoint: (endpoint: string) => void
  setAIInteractionAPITokenProvider: (provider: () => Promise<string>) => void
  setAIDescription: (description: string) => void
  startGame(buffer: ArrayBuffer): Promise<void>
  stopGame(): Promise<void>
  onGameError: (callback: (err: string) => void) => void
  onGameExit: (callback: (code: number) => void) => void
  onConsole: (callback: (type: string, msg: string) => void) => void
}

declare global {
  interface Window {
    spxGuiDesktop: SpxGuiDesktop | undefined
  }
}
</script>

<script setup lang="ts">
const props = defineProps<{ project: Project }>()

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
  exit: [code: number]
}>()

const loading = ref(false)
const [thumbnailUrl, thumbnailUrlLoading] = useFileUrl(() => props.project.thumbnail)
const failed = ref(false)
const exited = ref(false)

const spxGuiDesktop = window.spxGuiDesktop
if (spxGuiDesktop == null) throw new Error('spxGuiDesktop expected')

onMounted(() => {
  spxGuiDesktop.onConsole((type, msg) => {
    if (type === 'warning') {
      console.warn(msg)
      emit('console', 'warn', [msg])
    } else {
      // eslint-disable-next-line no-console
      console.log(msg)
      emit('console', 'log', [msg])
    }
  })
  spxGuiDesktop.onGameError((err: string) => {
    console.warn('ProjectRunner game error:', err)
    failed.value = true
  })
  spxGuiDesktop.onGameExit((code: number) => {
    exited.value = true
    emit('exit', code)
  })
})

const registered = registerPlayer(() => {
  // For now we don't need to implement stop handler here because there's no chance for
  // the user to activate another audio player when `ProjectRunner` visible.
  // If you see this warning in console, you need to think what the proper behavior is.
  console.warn('unexpected call')
})

const progressRef = ref<Progress>({ percentage: 0, desc: null })

let runPromise: Promise<unknown> | null = null
let runCtrl: AbortController | null = null
function getRunCtrl() {
  runCtrl?.abort(new Cancelled('new run'))
  const ctrl = new AbortController()
  runCtrl = ctrl
  return ctrl
}

onUnmounted(() => {
  runCtrl?.abort(new Cancelled('unmounted'))
  registered.onStopped()
})

async function runNative(ctrl: AbortController) {
  const spxGuiDesktop = window.spxGuiDesktop
  if (spxGuiDesktop == null) throw new Error('spxGuiDesktop is not available')

  loading.value = true
  failed.value = false
  exited.value = false
  try {
    const collector = new ProgressCollector()
    collector.onProgress(throttle((progress) => (progressRef.value = progress), 100))
    const getProjectDataReporter = collector.getSubReporter(
      { en: 'Loading project data...', zh: '加载项目数据中...' },
      5
    )
    const startGameReporter = collector.getSubReporter(
      { en: 'Loading engine & starting project...', zh: '加载引擎并启动项目中...' },
      5
    )

    registered.onStart()

    const files = props.project.exportGameFiles()

    const [zipped, aiDescription] = await Promise.all([
      zip(files, getProjectDataReporter, ctrl.signal),
      // Conditionally generate AI description only if project uses AI Interaction features
      isProjectUsingAIInteraction(props.project)
        ? props.project.ensureAIDescription(false, ctrl.signal)
        : Promise.resolve(null)
    ])

    startGameReporter.startAutoReport(10 * 1000)
    if (isProjectUsingAIInteraction(props.project)) {
      spxGuiDesktop.setAIDescription(aiDescription!)
      spxGuiDesktop.setAIInteractionAPIEndpoint(apiBaseUrl + '/ai/interaction')
      spxGuiDesktop.setAIInteractionAPITokenProvider(async () => (await ensureAccessToken()) ?? '')
    }
    await spxGuiDesktop.startGame(zipped)
    ctrl.signal.throwIfAborted()
    startGameReporter.report(1)
    return hashFiles(files)
  } catch (err) {
    console.warn('ProjectRunner runNative game error:', err)
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function stopNative() {
  const spxGuiDesktop = window.spxGuiDesktop
  if (spxGuiDesktop == null) return
  await spxGuiDesktop.stopGame()
}

defineExpose({
  async run() {
    const ctrl = getRunCtrl()
    const promise = runNative(ctrl)
    runPromise = promise
    return promise.finally(() => {
      if (runPromise === promise) runPromise = null
    })
  },
  async stop() {
    const promise = runPromise
    runCtrl?.abort(new Cancelled('stop'))
    if (promise != null) await promise.catch(() => {})
    loading.value = false

    await stopNative()
    registered.onStopped()
    progressRef.value = { percentage: 0, desc: null }
  },
  async rerun() {
    await this.stop()
    return this.run()
  }
})
</script>

<template>
  <div class="project-runner">
    <div v-if="!exited" class="running">{{ $t({ en: 'Running in separate window...', zh: '独立窗口运行中...' }) }}</div>
    <div v-else class="exited">{{ $t({ en: 'Running window closed', zh: '运行窗口已关闭' }) }}</div>
    <UIImg v-show="progressRef.percentage !== 1" class="thumbnail" :src="thumbnailUrl" :loading="thumbnailUrlLoading" />
    <UIDetailedLoading :visible="loading" cover :percentage="progressRef.percentage">
      <span>{{ $t(progressRef.desc ?? { en: 'Loading...', zh: '加载中...' }) }}</span>
    </UIDetailedLoading>
    <RunningError v-show="!loading && failed" />
  </div>
</template>

<style lang="scss" scoped>
.project-runner {
  position: relative;
  aspect-ratio: 4 / 3;
  display: flex;
  justify-content: center;
  align-items: center;
}
.running {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  color: var(--ui-color-text-700);
}
.thumbnail {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}
</style>
