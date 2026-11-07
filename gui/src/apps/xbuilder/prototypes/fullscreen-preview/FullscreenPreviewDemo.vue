<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIButton, useMessage } from '@/components/ui'
import ProjectRunnerSurface from '@/components/project/runner/ProjectRunnerSurface.vue'
import { useI18n } from '@/utils/i18n'
import logo from '@/assets/logo.svg'
import { createSampleProject, samples } from './project'

useI18n().setLang('zh')

const message = useMessage()
const projects = samples.map(createSampleProject)
const selected = ref(0)
const sample = computed(() => samples[selected.value])
const project = computed(() => projects[selected.value])
const fullscreen = ref(false)
const runner = ref<InstanceType<typeof ProjectRunnerSurface> | null>(null)
const runnerState = ref<'initial' | 'loading' | 'running'>('initial')
const stopping = ref(false)
let runAttempt = 0

function select(index: number) {
  if (selected.value === index) return
  selected.value = index
  runAttempt++
  runnerState.value = 'initial'
}

async function runProject(restart = false) {
  const surface = runner.value
  if (surface == null) return
  const attempt = ++runAttempt
  runnerState.value = 'loading'
  try {
    await (restart ? surface.rerun() : surface.run())
    if (runAttempt === attempt) runnerState.value = 'running'
  } catch {
    if (runAttempt !== attempt) return
    runnerState.value = 'initial'
    message.error('示例运行失败，请重试')
  }
}

async function stopProject() {
  runAttempt++
  stopping.value = true
  try {
    await runner.value?.stop()
    runnerState.value = 'initial'
  } catch {
    message.error('停止示例失败，请重试')
  } finally {
    stopping.value = false
  }
}

function enterFullscreen() {
  fullscreen.value = true
  if (runnerState.value === 'initial') void runProject()
}

function handleExit() {
  if (runnerState.value === 'running') runnerState.value = 'initial'
}
</script>

<template>
  <div class="min-h-screen bg-grey-200">
    <header class="border-b border-grey-400 bg-grey-100">
      <div class="mx-auto flex max-w-255 items-center gap-3 px-6 py-4">
        <img :src="logo" alt="" class="size-7" />
        <span class="font-semibold text-title">XBuilder</span>
        <span class="text-sm text-grey-700">全屏预览原型</span>
      </div>
    </header>
    <main class="mx-auto max-w-255 px-6 pt-10 pb-8">
      <h1 class="text-3xl font-semibold text-title">沉浸式全屏预览</h1>
      <p class="mt-3 text-grey-800">选择画幅，进入全屏后点击发光的星星进行采样。鼠标移到页面最顶部可调出工具栏。</p>
      <section class="mt-7 overflow-hidden rounded-xl border border-grey-400 bg-grey-100">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-grey-400 p-4">
          <div role="group" aria-label="游戏画幅" class="flex flex-wrap gap-2">
            <UIButton
              v-for="(item, index) in samples"
              :key="item.ratio"
              v-radar="{ name: item.ratio, desc: item.label }"
              :type="index === selected ? 'secondary' : 'white'"
              :aria-pressed="index === selected"
              :disabled="stopping"
              @click="select(index)"
            >
              {{ item.ratio }} {{ item.label }}
            </UIButton>
          </div>
          <UIButton
            v-radar="{ name: '进入全屏', desc: '全屏试玩星轨采样' }"
            icon="enterFullScreen"
            :disabled="stopping"
            @click="enterFullscreen"
          >
            进入全屏
          </UIButton>
        </div>
        <div class="stage-host flex items-center justify-center bg-grey-300 p-4">
          <div class="stage-frame" :style="{ '--sample-ratio': sample.width / sample.height }">
            <ProjectRunnerSurface
              :key="sample.ratio"
              ref="runner"
              v-model:fullscreen="fullscreen"
              :project="project"
              :runner-state="runnerState"
              :run-loading="runnerState === 'loading'"
              :rerun-loading="runnerState === 'loading'"
              :stop-loading="stopping"
              :on-run="() => runProject()"
              :on-rerun="() => runProject(true)"
              :on-stop="stopProject"
              @exit="handleExit"
            />
          </div>
        </div>
        <p class="px-4 py-3 text-sm text-grey-800">星轨采样 · {{ sample.width }} × {{ sample.height }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.stage-host {
  height: clamp(220px, 50vh, 440px);
  container-type: size;
}

.stage-frame {
  width: min(100cqw, calc(100cqh * var(--sample-ratio)));
  aspect-ratio: var(--sample-ratio);
}
</style>
