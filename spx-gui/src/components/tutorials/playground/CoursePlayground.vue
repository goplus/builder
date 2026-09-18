<script setup lang="ts">
import { nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useQuery } from '@/utils/query'
import { useEnsureSignedIn } from '@/utils/user'
import { getOwnProjectEditorRoute } from '@/apps/xbuilder/router'
import { useSignedInStateQuery } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import type { TutorialProject } from '@/models/tutorial/project'
import { useCopilot } from '@/components/copilot/context'
import { useRadar } from '@/utils/radar'
import { useSpotlight } from '@/utils/spotlight'
import type { SpotlightOptions } from '@/utils/tutorial-framework'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import type { ILocalCache } from '@/components/editor/editing'
import { EditorState } from '@/components/editor/editor-state'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { CodeEditorProvider, loadMonaco } from '@/components/editor/spx-code-editor'
import { UIDetailedLoading, UIError, useModal } from '@/components/ui'
import { useSaveProjectAs } from '@/components/project'
import { useProjectConfig } from '@/components/project/config'

import { PlaygroundCourseRunner, type PlaygroundCourseCompletion } from './runner'
import CoursePlaygroundMessageModal from './CoursePlaygroundMessageModal.vue'

const props = defineProps<{
  project: TutorialProject
  inEditorPath?: string | string[]
}>()

const emit = defineEmits<{
  courseCompleted: [completion: PlaygroundCourseCompletion]
  failed: [error: Error]
}>()

const localCache: ILocalCache = {
  async load() {
    return null
  },
  async save() {},
  async clear() {}
}

const i18n = useI18n()
const router = useRouter()
const copilot = useCopilot()
const radar = useRadar()
const spotlight = useSpotlight()
const { isOnline } = useNetwork()
const signedInStateQuery = useSignedInStateQuery()
const { rulerVisible } = useProjectConfig()

const state = shallowRef<EditorState | null>(null)
const initializationError = ref<Error | null>(null)
const ensureSignedIn = useEnsureSignedIn()
const saveProjectAs = useSaveProjectAs()

async function saveAsMyProject() {
  await ensureSignedIn()
  // A learning result is a plain SPX project. Generated editor state is
  // intentionally course-local and must not be copied into the user's project.
  const snapshot = await props.project.project.export()
  const name = await saveProjectAs(snapshot)
  await router.push(getOwnProjectEditorRoute(name))
}

let disposed = false
async function initialize() {
  const previousState = state.value
  state.value = null
  initializationError.value = null
  await nextTick()
  previousState?.dispose()

  try {
    const routeInEditorPath = Array.isArray(props.inEditorPath) ? props.inEditorPath.join('/') : props.inEditorPath
    const inEditorPath = routeInEditorPath || props.project.config?.inEditorPath || ''
    await router.replace({
      params: {
        ...router.currentRoute.value.params,
        inEditorPath: inEditorPath.split('/').filter((segment) => segment !== '')
      },
      query: router.currentRoute.value.query,
      hash: router.currentRoute.value.hash
    })
    if (disposed) return

    const nextState = new EditorState(
      i18n,
      props.project.project,
      isOnline,
      signedInStateQuery,
      cloudHelpers,
      localCache
    )
    nextState.editing.startEditing()
    nextState.syncWithRouter(router)
    state.value = nextState
  } catch (error) {
    if (disposed) return
    initializationError.value = error instanceof Error ? error : new Error(String(error))
  }
}

watch(
  () => props.project,
  () => void initialize(),
  { immediate: true }
)

const monacoQueryRet = useQuery(() => loadMonaco(i18n.lang.value), {
  en: 'Failed to load code editor',
  zh: '加载代码编辑器失败'
})

const openMessage = useModal(CoursePlaygroundMessageModal)

const presentation = {
  showMessage(content: string) {
    return openMessage({ content })
  },
  async revealSpotlight(target: string, tip: string, options: SpotlightOptions) {
    const node = radar.select(target)
    if (node == null) {
      console.warn(`Tutorial Spotlight target not found: ${target}`)
      return
    }
    spotlight.reveal(node.getElement(), tip, options)
  },
  setRulerVisible(visible: boolean) {
    rulerVisible.value = visible
  }
}

let runner: PlaygroundCourseRunner | null = null
const stopRunnerStart = watch([() => monacoQueryRet.data.value, state], async ([monaco, editorState]) => {
  if (monaco == null || editorState == null) return
  stopRunnerStart()
  await nextTick()
  if (disposed) return
  runner?.dispose()
  const nextRunner = new PlaygroundCourseRunner({
    project: props.project,
    editorState,
    copilot,
    presentation
  })
  nextRunner.on('completed', (completion) => emit('courseCompleted', completion))
  nextRunner.on('failed', (error) => emit('failed', error))
  runner = nextRunner
  void nextRunner.start().catch(() => {})
})

onUnmounted(() => {
  disposed = true
  stopRunnerStart()
  runner?.dispose()
  state.value?.dispose()
  rulerVisible.value = false
  props.project.project.dispose()
})
</script>

<template>
  <section class="relative min-h-full w-full flex flex-col bg-grey-300">
    <header class="flex-none">
      <EditorNavbar
        v-if="state != null"
        :project="state.project"
        :state="state"
        :save-as-my-project="saveAsMyProject"
      />
    </header>
    <main class="flex-[1_1_0] flex gap-xl p-4 pt-2">
      <UIDetailedLoading v-if="state == null && initializationError == null" :percentage="0">
        <span>{{ $t({ en: 'Preparing course...', zh: '准备课程中...' }) }}</span>
      </UIDetailedLoading>
      <UIError v-else-if="initializationError != null" :retry="initialize">
        {{ initializationError.message }}
      </UIError>
      <UIDetailedLoading
        v-else-if="monacoQueryRet.isLoading.value"
        :percentage="monacoQueryRet.progress.value.percentage"
      >
        <span>{{ $t({ en: 'Loading editor...', zh: '加载编辑器中...' }) }}</span>
      </UIDetailedLoading>
      <UIError v-else-if="monacoQueryRet.error.value != null" :retry="monacoQueryRet.refetch">
        {{ $t(monacoQueryRet.error.value.userMessage) }}
      </UIError>
      <EditorContextProvider v-else-if="state != null" :project="state.project" :state="state">
        <CodeEditorProvider :monaco="monacoQueryRet.data.value!">
          <ProjectEditor />
        </CodeEditorProvider>
      </EditorContextProvider>
    </main>
  </section>
</template>
