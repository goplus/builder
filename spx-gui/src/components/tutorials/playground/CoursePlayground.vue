<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { ProgressCollector, type Progress } from '@/utils/progress'
import { composeQuery, useQuery, type QueryRet } from '@/utils/query'
import { useProvideReadiness, useRegisterLoading } from '@/utils/readiness'
import { useEnsureSignedIn } from '@/utils/user'
import { useMessageHandle } from '@/utils/exception'
import { getOwnProjectEditorRoute } from '@/apps/xbuilder/router'
import { useSignedIn } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import type { TutorialProject } from '@/models/tutorial/project'
import { useCopilot } from '@/components/copilot/context'
import { useRadar } from '@/utils/radar'
import type { IScopedRouter } from '@/utils/route'
import { useSpotlight } from '@/utils/spotlight'
import type { SpotlightOptions } from '@/utils/tutorial-framework'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import type { ILocalCache } from '@/components/editor/editing'
import { EditorState } from '@/components/editor/editor-state'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { CodeEditorProvider, loadMonaco } from '@/components/editor/spx-code-editor'
import { UIDetailedLoading, UIError, UIMenuGroup, UIMenuItem, useModal } from '@/components/ui'
import { useSaveProjectAs } from '@/components/project'

import type { PlaygroundCourseCompletion, PlaygroundCoursePresentationOptions } from './program'
import CoursePlaygroundMessageModal from './CoursePlaygroundMessageModal.vue'
import CoursePlaygroundVideoModal from './CoursePlaygroundVideoModal.vue'
import { PlaygroundCourseSession } from './session'
import { OpeningGuide, type OpeningGuideKind } from './opening-guide'

const props = defineProps<{
  projectQueryRet: QueryRet<TutorialProject>
  /** Navigation scoped to this Course Playground. */
  router: IScopedRouter
}>()

const emit = defineEmits<{
  courseCompleted: [completion: PlaygroundCourseCompletion]
  courseRestart: []
}>()

const i18n = useI18n()
const globalRouter = useRouter()
const copilot = useCopilot()
const radar = useRadar()
const spotlight = useSpotlight()
const { isOnline } = useNetwork()
const signedIn = useSignedIn()
const ensureSignedIn = useEnsureSignedIn()
const saveProjectAs = useSaveProjectAs()

const handleSaveAsMyProject = useMessageHandle(
  async () => {
    await ensureSignedIn()
    // A learning result is a plain SPX project. Generated editor state is
    // intentionally course-local and must not be copied into the user's project.
    const project = session.value?.project
    if (project == null) return
    const snapshot = await project.project.export()
    const name = await saveProjectAs(snapshot)
    await globalRouter.push(getOwnProjectEditorRoute(name))
  },
  { en: 'Failed to save project', zh: '保存项目失败' }
).fn

const monacoQueryRet = useQuery(
  async (ctx) => {
    const lang = i18n.lang.value
    ctx.reporter.startAutoReport(1000, { signal: ctx.signal })
    const monaco = await loadMonaco(lang)
    ctx.reporter.report(1)
    return monaco
  },
  { en: 'Failed to load code editor', zh: '加载代码编辑器失败' }
)

const openMessage = useModal(CoursePlaygroundMessageModal)
const openVideo = useModal(CoursePlaygroundVideoModal)
let openingGuide: OpeningGuide | null = null

function getGuideButtonText(kind: OpeningGuideKind, buttonText: string | null) {
  const action = openingGuide?.take(kind)
  if (buttonText != null || action == null) return buttonText
  return i18n.t(action === 'next' ? { en: 'Next', zh: '下一步' } : { en: 'Start', zh: '开始' })
}

const presentation = {
  showPrelude(messages: string[], { buttonText, signal }: PlaygroundCoursePresentationOptions) {
    buttonText = getGuideButtonText('prelude', buttonText)
    return openMessage({ contents: messages, buttonText, kind: 'prelude' }, { signal })
  },
  showMessage(content: string, { buttonText, signal }: PlaygroundCoursePresentationOptions) {
    return openMessage({ contents: [content], buttonText, kind: 'message' }, { signal })
  },
  showVideo(videoName: string, { buttonText, signal }: PlaygroundCoursePresentationOptions) {
    const video = session.value?.project.videos.find((video) => video.name === videoName)
    if (video == null) throw new Error(`Video ${videoName} not found`)
    buttonText = getGuideButtonText('video', buttonText)
    return openVideo({ video, buttonText }, { signal })
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

const readiness = useProvideReadiness()
// Query preparation completes when Session is constructed; Course startup continues separately.
const progress = shallowRef<Progress>({ percentage: 0, timeLeft: null, desc: null })
const progressCollector = new ProgressCollector()
progressCollector.onProgress((value) => {
  progress.value = value
})
const preparationReporter = progressCollector.getSubReporter(null, 0.5)
const startProgressReporter = progressCollector.getSubReporter({ en: 'Starting course...', zh: '启动课程中...' }, 0.5)

const sessionQueryRet: QueryRet<PlaygroundCourseSession> = useQuery(
  async (ctx) => {
    openingGuide = null
    startProgressReporter.report(0)
    const project = await composeQuery(ctx, props.projectQueryRet)
    ctx.signal.throwIfAborted()
    openingGuide = new OpeningGuide(project.mainCourse.code)
    const editorState = new EditorState(i18n, project.project, isOnline, signedIn, cloudHelpers, noLocalCache)
    editorState.editing.startEditing()
    editorState.syncWithRouter(props.router)
    const session = new PlaygroundCourseSession({
      project,
      editorState,
      copilot,
      presentation,
      readiness,
      startReporter: startProgressReporter
    })
    session.disposeOnSignal(ctx.signal)
    editorState.disposeOnSignal(ctx.signal)
    session.on('completed', (completion) => emit('courseCompleted', completion))
    void session.start()
    ctx.reporter.report(1)
    return session
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  },
  { clearResultOnFetch: true }
)

const preparedQueryRet = useQuery(
  (ctx) =>
    Promise.all([
      composeQuery(ctx, sessionQueryRet, [{ en: 'Loading course...', zh: '加载课程中...' }, 4]),
      composeQuery(ctx, monacoQueryRet, [{ en: 'Loading editor...', zh: '加载编辑器中...' }, 1])
    ]),
  { en: 'Failed to prepare course', zh: '准备课程失败' },
  { clearResultOnFetch: true }
)

watch(preparedQueryRet.progress, (value) => preparationReporter.report(value), { immediate: true })

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
const preparing = computed(() => preparedQueryRet.isLoading.value || session.value?.starting === true)
const loading = computed(() => error.value == null && preparing.value)
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
        :title="projectQueryRet.data.value?.title"
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
        <UIDetailedLoading v-else :percentage="progress.percentage">
          <span>{{ $t(progress.desc ?? { en: 'Preparing course...', zh: '准备课程中...' }) }}</span>
        </UIDetailedLoading>
      </div>
    </main>
  </section>
</template>
