<script lang="ts">
import type { ILocalCache } from '@/components/editor/editing'

// A Project Snapshot has no owner, so it is edited in EffectFree mode and never cached.
const noLocalCache: ILocalCache = {
  load: async () => null,
  save: async () => {},
  clear: async () => {}
}
</script>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import { DefaultException } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { composeQuery, useQuery } from '@/utils/query'
import { useRegisterUpdateRouteLoaded } from '@/utils/route-loading'
import { usePageTitle } from '@/utils/utils'
import * as feedbackAdminApis from '@/apis/admin/feedback'
import { cloudHelpers } from '@/models/common/cloud'
import { SpxProject } from '@/models/spx/project'
import { useSignedIn } from '@/stores/user'
import { UIDetailedLoading, UIError, useConfirmDialogWithResult } from '@/components/ui'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { CodeEditorProvider, loadMonaco } from '@/components/editor/spx-code-editor'
import { EditorState } from '@/components/editor/editor-state'
import { loadProjectSnapshot, projectSnapshotUrlSchema } from '@/components/feedback/project-snapshot'

const props = defineProps<{
  feedbackID: string
}>()

const router = useRouter()
const signedIn = useSignedIn()
const i18n = useI18n()
const { t } = i18n
const { isOnline } = useNetwork()
const confirm = useConfirmDialogWithResult()

usePageTitle({ en: 'Project snapshot', zh: '项目快照' })

const stateQueryRet = useQuery(
  async (ctx) => {
    // Access route deps synchronously, so their change will drive `useQuery` to re-fetch
    const feedbackID = props.feedbackID
    await nextTick()

    ctx.reporter.startAutoReport(1000, { signal: ctx.signal })
    const feedback = await feedbackAdminApis.getFeedback(feedbackID)
    ctx.signal.throwIfAborted()
    const snapshotUrl = projectSnapshotUrlSchema.safeParse(feedback.context?.projectSnapshotUrl)
    if (!snapshotUrl.success)
      throw new DefaultException({
        en: 'No project snapshot is available for this feedback',
        zh: '该反馈没有可用的项目快照'
      })
    const files = await loadProjectSnapshot(snapshotUrl.data, ctx.signal)
    const project = new SpxProject()
    project.disposeOnSignal(ctx.signal)
    project.setMetadata({ displayName: t({ en: 'Project snapshot', zh: '项目快照' }) })
    await project.loadFiles(files)
    ctx.signal.throwIfAborted()

    const state = new EditorState(i18n, project, isOnline, signedIn, cloudHelpers, noLocalCache)
    state.disposeOnSignal(ctx.signal)
    state.editing.startEditing()
    state.syncWithRouter(router)
    ctx.reporter.report(1)
    return state
  },
  { en: 'Failed to load project snapshot', zh: '加载项目快照失败' }
)

const state = stateQueryRet.data

const monacoQueryRet = useQuery(
  async (ctx) => {
    ctx.reporter.startAutoReport(1000, { signal: ctx.signal })
    const monaco = await loadMonaco(i18n.lang.value)
    ctx.reporter.report(1)
    return monaco
  },
  { en: 'Failed to load code editor', zh: '加载代码编辑器失败' }
)

const allQueryRet = useQuery(
  (ctx) =>
    Promise.all([
      composeQuery(ctx, stateQueryRet, [{ en: 'Loading project snapshot...', zh: '加载项目快照中...' }, 2]),
      composeQuery(ctx, monacoQueryRet, [{ en: 'Loading code editor...', zh: '加载代码编辑器中...' }, 1])
    ]),
  { en: 'Failed to load editor', zh: '加载编辑器失败' }
)

useRegisterUpdateRouteLoaded(() => !allQueryRet.isLoading.value && allQueryRet.error.value == null)

onBeforeRouteLeave(() => {
  if (state.value?.editing.dirty !== true) return true
  return confirm({
    title: t({ en: 'Leave editor', zh: '离开编辑器' }),
    content: t({
      en: 'Project edits will not be saved if you leave now. Are you sure to leave?',
      zh: '若现在离开，对项目的修改将不会被保存。确定要离开吗？'
    }),
    cancelText: t({ en: 'Keep editing', zh: '继续编辑' }),
    confirmText: t({ en: 'Leave', zh: '离开' })
  })
})

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (state.value?.editing.dirty === true) event.preventDefault()
}

function preventDefaultSaveBehavior(event: KeyboardEvent) {
  const { metaKey, ctrlKey, key } = event
  if ((metaKey || ctrlKey) && key.toLowerCase() === 's') event.preventDefault()
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('keydown', preventDefaultSaveBehavior)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('keydown', preventDefaultSaveBehavior)
})
</script>

<template>
  <section class="min-h-full w-full flex flex-col bg-grey-300">
    <header class="flex-none">
      <EditorNavbar :project="state?.project ?? null" :state="state" />
    </header>
    <main class="flex-[1_1_0] flex gap-xl p-4 pt-2">
      <UIDetailedLoading v-if="allQueryRet.isLoading.value" :percentage="allQueryRet.progress.value.percentage">
        <span>{{ $t(allQueryRet.progress.value.desc ?? { en: 'Loading...', zh: '加载中...' }) }}</span>
      </UIDetailedLoading>
      <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
        {{ $t(allQueryRet.error.value.userMessage) }}
      </UIError>
      <EditorContextProvider v-else :project="state!.project" :state="state!">
        <CodeEditorProvider :monaco="monacoQueryRet.data.value!">
          <ProjectEditor />
        </CodeEditorProvider>
      </EditorContextProvider>
    </main>
  </section>
</template>
