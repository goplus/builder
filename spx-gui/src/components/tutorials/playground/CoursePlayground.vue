<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { composeQuery, useQuery } from '@/utils/query'
import { useProvideReadiness, useRegisterLoading } from '@/utils/readiness'
import { useEnsureSignedIn } from '@/utils/user'
import { useMessageHandle } from '@/utils/exception'
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
import { CodeEditorProvider, loadMonaco } from '@/components/editor/spx-code-editor'
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

const readiness = useProvideReadiness()

const sessionQueryRet = useQuery(
  async (ctx) => {
    const project = props.project

    // Add `nextTick` to avoid data accessing in following code to be considered as deps, which will cause unnecessary query fetching.
    // TODO: Refactor `useQuery` to accept deps fn explicitly to avoid such issue.
    await nextTick()
    ctx.signal.throwIfAborted()

    const editorState = new EditorState(i18n, project.project, isOnline, signedInStateQuery, cloudHelpers, noLocalCache)
    editorState.editing.startEditing()
    editorState.syncWithRouter(inEditorRouter)
    const session = new PlaygroundCourseSession({
      project,
      editorState,
      copilot,
      presentation,
      readiness
    })
    session.disposeOnSignal(ctx.signal)
    editorState.disposeOnSignal(ctx.signal)
    session.on('completed', (completion) => emit('courseCompleted', completion))
    void session.start()
    return session
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  },
  { clearResultOnFetch: true }
)

const preparedQueryRet = useQuery(
  (ctx) => Promise.all([composeQuery(ctx, sessionQueryRet), composeQuery(ctx, monacoQueryRet)]),
  { en: 'Failed to prepare course', zh: '准备课程失败' },
  { clearResultOnFetch: true }
)

const session = sessionQueryRet.data
const error = computed(() => {
  if (preparedQueryRet.error.value != null) {
    return { exception: preparedQueryRet.error.value, retry: preparedQueryRet.refetch }
  }
  if (session.value?.error != null) {
    return { exception: session.value.error, retry: () => emit('courseRestart') }
  }
  return null
})
const loading = computed(
  () => error.value == null && (preparedQueryRet.isLoading.value || session.value?.starting !== false)
)
const covered = computed(() => loading.value || error.value != null)
// The page waits for presentation, while this subtree's Host can become ready under the cover.
useRegisterLoading(loading)
</script>

<template>
  <section class="min-h-full w-full flex flex-col bg-grey-300">
    <header class="flex-none">
      <EditorNavbar
        :project="session?.project.project ?? null"
        :state="session?.editorState ?? null"
        :title="project.title"
      >
        <template #project-menu>
          <UIMenuGroup :disabled="session == null || !isOnline">
            <UIMenuItem @click="handleSaveAsMyProject">
              {{ $t({ en: 'Save as my project...', zh: '另存为我的项目...' }) }}
            </UIMenuItem>
          </UIMenuGroup>
        </template>
      </EditorNavbar>
    </header>
    <main class="relative flex-[1_1_0] flex p-4 pt-2">
      <div class="flex flex-1 min-w-0 gap-xl" :inert="covered">
        <EditorContextProvider
          v-if="session != null && monacoQueryRet.data.value != null"
          :project="session.project.project"
          :state="session.editorState"
        >
          <CodeEditorProvider
            :monaco="monacoQueryRet.data.value"
            :api-whitelist="session.apiWhitelist.apis"
            @ready="session.setCodeEditor($event)"
          >
            <ProjectEditor :ruler-enabled="session.ruler.enabled" />
          </CodeEditorProvider>
        </EditorContextProvider>
      </div>
      <div
        v-if="covered"
        class="absolute inset-0 z-20 flex items-center justify-center bg-grey-300"
        :role="error != null ? 'alert' : 'status'"
      >
        <UIError v-if="error != null" :retry="error.retry">
          {{ $t(error.exception.userMessage) }}
        </UIError>
        <UIDetailedLoading v-else :percentage="preparedQueryRet.progress.value.percentage">
          <span>{{
            $t(preparedQueryRet.progress.value.desc ?? { en: 'Preparing course...', zh: '准备课程中...' })
          }}</span>
        </UIDetailedLoading>
      </div>
    </main>
  </section>
</template>
