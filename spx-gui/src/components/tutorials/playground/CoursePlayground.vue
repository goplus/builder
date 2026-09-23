<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useQuery } from '@/utils/query'
import { useEnsureSignedIn } from '@/utils/user'
import { type Exception, useMessageHandle } from '@/utils/exception'
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
import { UIDetailedLoading, UIError, UIMenuGroup, UIMenuItem, useModal } from '@/components/ui'
import { useSaveProjectAs } from '@/components/project'

import type { PlaygroundCourseCompletion } from './runner'
import CoursePlaygroundMessageModal from './CoursePlaygroundMessageModal.vue'
import { PlaygroundCourseRunner } from './runner'

const props = defineProps<{
  project: TutorialProject
}>()

const emit = defineEmits<{
  courseCompleted: [completion: PlaygroundCourseCompletion]
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

const runningErr = ref<Exception | null>(null)

const runnerQueryRet = useQuery(
  async (ctx) => {
    runningErr.value = null
    const project = props.project
    const editorState = new EditorState(i18n, project.project, isOnline, signedInStateQuery, cloudHelpers, noLocalCache)
    editorState.disposeOnSignal(ctx.signal)
    editorState.editing.startEditing()
    editorState.syncWithRouter(router)
    const runner = new PlaygroundCourseRunner({
      project,
      editorState,
      copilot,
      presentation
    })
    runner.disposeOnSignal(ctx.signal)
    runner.on('completed', (completion) => {
      runner.dispose()
      emit('courseCompleted', completion)
    })
    runner.on('failed', (e) => {
      runner.dispose()
      runningErr.value = e
    })
    // Give the editor time to mount before the course accesses UI targets such as Spotlight.
    // TODO: Replace this fixed delay with a reliable editor-ready signal.
    const startTimer = setTimeout(() => {
      void runner.start().catch(() => {})
    }, 300)
    runner.addDisposer(() => clearTimeout(startTimer))
    return runner
  },
  {
    en: 'Failed to start course',
    zh: '启动课程失败'
  },
  { clearDataOnFetch: true }
)

const runner = runnerQueryRet.data
</script>

<template>
  <section class="relative min-h-full w-full flex flex-col bg-grey-300">
    <header class="flex-none">
      <EditorNavbar
        v-if="runner != null"
        :project="runner.project.project"
        :state="runner.editorState"
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
    <main class="flex-[1_1_0] flex gap-xl p-4 pt-2">
      <UIDetailedLoading v-if="runnerQueryRet.isLoading.value" :percentage="runnerQueryRet.progress.value.percentage">
        <span>{{ $t({ en: 'Preparing course...', zh: '准备课程中...' }) }}</span>
      </UIDetailedLoading>
      <UIError v-else-if="runnerQueryRet.error.value != null" :retry="runnerQueryRet.refetch">
        {{ $t(runnerQueryRet.error.value.userMessage) }}
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
      <UIError v-else-if="runningErr != null" :retry="runnerQueryRet.refetch">
        {{ $t(runningErr.userMessage) }}
      </UIError>
      <EditorContextProvider v-else-if="runner != null" :project="runner.project.project" :state="runner.editorState">
        <CodeEditorProvider :monaco="monacoQueryRet.data.value!" :api-whitelist="runner.apiWhitelist">
          <ProjectEditor :ruler-enabled="runner.rulerEnabled" />
        </CodeEditorProvider>
      </EditorContextProvider>
    </main>
  </section>
</template>
