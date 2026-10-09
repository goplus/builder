<script setup lang="ts">
import { computed, nextTick, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useQuery } from '@/utils/query'
import { until } from '@/utils/utils'
import { useProvideUIReady } from '@/utils/ui-ready'
import { useEnsureSignedIn } from '@/utils/user'
import { capture, type Exception, useMessageHandle } from '@/utils/exception'
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
import { EditorState, type IInEditorRouter } from '@/components/editor/editor-state'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { CodeEditorProvider, loadMonaco, type CodeEditor } from '@/components/editor/spx-code-editor'
import { UIDetailedLoading, UIError, UIMenuGroup, UIMenuItem, useModal } from '@/components/ui'
import { useSaveProjectAs } from '@/components/project'

import type { PlaygroundCourseCompletion } from './program'
import CoursePlaygroundMessageModal from './CoursePlaygroundMessageModal.vue'
import CoursePlaygroundVideoModal from './CoursePlaygroundVideoModal.vue'
import { PlaygroundCourseSession } from './session'
import { repeatableParamToPathSegments } from '@/utils/route'

const props = defineProps<{
  project: TutorialProject
  inEditorPath: string | string[]
}>()

const emit = defineEmits<{
  courseCompleted: [completion: PlaygroundCourseCompletion]
  courseRestart: []
}>()

const i18n = useI18n()
const router = useRouter()
const copilot = useCopilot()
const radar = useRadar()
const spotlight = useSpotlight()
const { isOnline } = useNetwork()
const signedInStateQuery = useSignedInStateQuery()
const ensureSignedIn = useEnsureSignedIn()
const saveProjectAs = useSaveProjectAs()

const handleSaveAsMyProject = useMessageHandle(
  async () => {
    await ensureSignedIn()
    // A learning result is a plain SPX project. Generated editor state is
    // intentionally course-local and must not be copied into the user's project.
    const snapshot = await props.project.project.export()
    const name = await saveProjectAs(snapshot)
    await router.push(getOwnProjectEditorRoute(name))
  },
  { en: 'Failed to save project', zh: '保存项目失败' }
).fn

const monacoQueryRet = useQuery(() => loadMonaco(i18n.lang.value), {
  en: 'Failed to load code editor',
  zh: '加载代码编辑器失败'
})

const openMessage = useModal(CoursePlaygroundMessageModal)
const openVideo = useModal(CoursePlaygroundVideoModal)
const codeEditor = shallowRef<CodeEditor | null>(null)

const presentation = {
  showPrelude(content: string, signal: AbortSignal) {
    return openMessage({ content, kind: 'prelude' }, { signal })
  },
  showMessage(content: string, signal: AbortSignal) {
    return openMessage({ content, kind: 'message' }, { signal })
  },
  showVideo(videoName: string, signal: AbortSignal) {
    const video = props.project.videos.find((video) => video.name === videoName)
    if (video == null) throw new Error(`Video ${videoName} not found`)
    return openVideo({ video }, { signal })
  },
  async revealSpotlight(target: string, tip: string, options: SpotlightOptions) {
    const node = radar.select(target)
    if (node == null) {
      console.warn(`Tutorial Spotlight target not found: ${target}`)
      return
    }
    spotlight.reveal(node.getElement(), { tip, ...options })
  }
}

const noLocalCache: ILocalCache = {
  async load() {
    return null
  },
  async save() {},
  async clear() {}
}

const inEditorRouter: IInEditorRouter = {
  currentPath: computed(() => repeatableParamToPathSegments(props.inEditorPath)),
  push: (newPath, options) => {
    const currentRoute = router.currentRoute.value
    // Vue Router checks if we are already on the same route, and prevents redundant navigation.
    // So we do not need to check it manually to avoid infinite loops.
    return router.push({
      params: {
        ...currentRoute.params,
        inEditorPath: newPath
      },
      query: currentRoute.query,
      replace: options?.replace
    })
  }
}

const runningErr = ref<Exception | null>(null)
const editorReady = useProvideUIReady()
const starting = ref(true)

const sessionQueryRet = useQuery(
  async (ctx) => {
    runningErr.value = null
    starting.value = true
    codeEditor.value = null
    const project = props.project

    // Add `nextTick` to avoid data accessing in following code to be considered as deps, which will cause unnecessary query fetching.
    // TODO: Refactor `useQuery` to accept deps fn explicitly to avoid such issue.
    await nextTick()
    ctx.signal.throwIfAborted()

    const editorState = new EditorState(i18n, project.project, isOnline, signedInStateQuery, cloudHelpers, noLocalCache)
    editorState.editing.startEditing()
    editorState.syncWithRouter(inEditorRouter)
    async function finishStarting(signal: AbortSignal) {
      await nextTick()
      await until(editorReady, signal)
      await nextTick()
      signal.throwIfAborted()
      starting.value = false
    }

    const session = new PlaygroundCourseSession({
      project,
      editorState,
      copilot,
      presentation,
      async waitForEditor(signal) {
        await until(() => sessionQueryRet.data.value === session && codeEditor.value != null, signal)
        await nextTick()
        await until(editorReady, signal)
        await nextTick()
        signal.throwIfAborted()
      },
      onStarted: finishStarting,
      async formatWorkspace() {
        if (codeEditor.value == null) throw new Error('Course Code Editor is not ready')
        await codeEditor.value.formatWorkspace()
      }
    })
    session.disposeOnSignal(ctx.signal)
    editorState.disposeOnSignal(ctx.signal)
    session.on('completed', (completion) => {
      // Completion disposes Program before its startup acknowledgment can arrive.
      void finishStarting(ctx.signal).catch((error) => {
        if (!ctx.signal.aborted) capture(error, 'Failed to render completed Course')
      })
      emit('courseCompleted', completion)
    })
    session.on('failed', (e) => {
      runningErr.value = e
    })
    void session.start()
    return session
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  },
  { clearDataOnFetch: true }
)

const session = sessionQueryRet.data
const covered = computed(
  () =>
    starting.value &&
    sessionQueryRet.error.value == null &&
    monacoQueryRet.error.value == null &&
    runningErr.value == null
)
</script>

<template>
  <section class="relative min-h-full w-full flex flex-col bg-grey-300">
    <header class="flex-none" :inert="covered">
      <EditorNavbar
        v-if="session != null"
        :project="session.project.project"
        :state="session.editorState"
        :title="project.title"
      >
        <template #project-menu>
          <UIMenuGroup :disabled="!isOnline">
            <UIMenuItem @click="handleSaveAsMyProject">
              {{ $t({ en: 'Save as my project...', zh: '另存为我的项目...' }) }}
            </UIMenuItem>
          </UIMenuGroup>
        </template>
      </EditorNavbar>
    </header>
    <main class="flex-[1_1_0] flex gap-xl p-4 pt-2" :inert="covered">
      <UIDetailedLoading v-if="sessionQueryRet.isLoading.value" :percentage="sessionQueryRet.progress.value.percentage">
        <span>{{ $t({ en: 'Preparing course...', zh: '准备课程中...' }) }}</span>
      </UIDetailedLoading>
      <UIError v-else-if="sessionQueryRet.error.value != null" :retry="sessionQueryRet.refetch">
        {{ $t(sessionQueryRet.error.value.userMessage) }}
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
      <UIError v-else-if="runningErr != null" :retry="() => emit('courseRestart')">
        {{ $t(runningErr.userMessage) }}
      </UIError>
      <EditorContextProvider
        v-else-if="session != null"
        :project="session.project.project"
        :state="session.editorState"
      >
        <CodeEditorProvider
          :monaco="monacoQueryRet.data.value!"
          :api-whitelist="session.apiWhitelist.apis"
          @ready="codeEditor = $event"
        >
          <ProjectEditor :ruler-enabled="session.ruler.enabled" />
        </CodeEditorProvider>
      </EditorContextProvider>
    </main>
    <div
      v-if="covered"
      class="absolute inset-0 z-20 flex items-center justify-center bg-grey-300"
      role="status"
      :aria-label="$t({ en: 'Preparing course...', zh: '准备课程中...' })"
    >
      <UIDetailedLoading :percentage="0">
        <span>{{ $t({ en: 'Preparing course...', zh: '准备课程中...' }) }}</span>
      </UIDetailedLoading>
    </div>
  </section>
</template>
