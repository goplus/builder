<template>
  <UIConfigProvider :config="uiConfig">
    <UIMessageProvider>
      <UIModalProvider>
        <div
          class="relative flex w-full aspect-4/3 flex-col overflow-hidden rounded-md border border-black/15 bg-white"
        >
          <div class="absolute top-3 right-3 z-100 flex gap-2">
            <button
              v-if="!running"
              :disabled="!runnable"
              class="cursor-pointer rounded-full border-none bg-primary-main px-3 py-1 text-sm font-medium text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleRun"
            >
              {{ $t({ en: 'Run', zh: '运行' }) }}
            </button>
            <button
              v-else
              class="cursor-pointer rounded-full border-none bg-red-main px-3 py-1 text-sm font-medium text-white shadow-sm transition-opacity"
              @click="handleStop"
            >
              {{ $t({ en: 'Stop', zh: '停止' }) }}
            </button>
          </div>

          <div class="relative h-full w-full flex-1">
            <ProjectRunner v-if="project != null" ref="runner" :project="project" @exit="handleExit" />
            <UILoading v-if="isLoading" cover mask="solid" />
            <UIError v-else-if="error != null" cover :retry="refetch">
              {{ $t(error.userMessage) }}
            </UIError>
          </div>
        </div>
      </UIModalProvider>
    </UIMessageProvider>
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@/utils/query'
import { useI18n } from '@/utils/i18n'
import { cloudHelpers } from '@/models/common/cloud'
import { SpxProject } from '@/models/spx/project'
import { UIConfigProvider, UIMessageProvider, UIModalProvider, UIError, UILoading, type Config } from '@/components/ui'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'
import { getUIConfig } from '@/setup'

const props = defineProps<{
  owner: string
  name: string
}>()

const i18n = useI18n()
const uiConfig = computed<Config>(() => getUIConfig(i18n))

const running = ref(false)
const runner = ref<InstanceType<typeof ProjectRunner>>()

const {
  data: project,
  isLoading,
  error,
  refetch
} = useQuery(
  async () => {
    const { owner, name } = props
    if (owner === '' || name === '') throw new Error('owner and name required')

    const project = new SpxProject()
    const serialized = await cloudHelpers.load(owner, name, true)
    await project.load(serialized)
    return project
  },
  { en: 'Load project failed', zh: '加载项目失败' }
)

const runnable = computed(() => project.value != null && !isLoading.value && error.value == null)

function handleRun() {
  if (!runnable.value || runner.value == null) return
  running.value = true
  runner.value.run()
}

async function handleStop() {
  if (runner.value == null) return
  await runner.value.stop()
  running.value = false
}

function handleExit() {
  running.value = false
}
</script>

<style>
/*
 * Declare the layer order inside the widget stylesheet entry before importing app.css.
 * The widget renders in its own shadow root, so the document-level workaround in the app HTML entry
 * does not apply here; this prelude must be parsed inside the widget stylesheet itself.
 * See: https://github.com/vitejs/vite/issues/21903
 */
@layer theme, base, components, utilities;

@import '../../../../app.css';
</style>
