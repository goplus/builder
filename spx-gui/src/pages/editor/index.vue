<template>
  <!-- TODO: review this background color and promote it to a shared UI token if it becomes reused. -->
  <section class="flex min-h-full w-full flex-col bg-[#e9fcff]">
    <header class="flex-[0_0_auto]">
      <EditorNavbar :project="state?.project ?? null" :state="state" />
    </header>
    <main class="flex-[1_1_0] flex gap-middle p-middle">
      <UIDetailedLoading v-if="allQueryRet.isLoading.value" :percentage="allQueryRet.progress.value.percentage">
        <span>{{ $t(allQueryRet.progress.value.desc ?? { en: 'Loading...', zh: '加载中...' }) }}</span>
      </UIDetailedLoading>
      <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
        {{ $t(allQueryRet.error.value.userMessage) }}
      </UIError>
      <EditorContextProvider v-else :project="state!.project" :state="state!">
        <ProjectEditor />
      </EditorContextProvider>
    </main>
  </section>
</template>

<script lang="ts">
const LOCAL_CACHE_KEY = 'XBUILDER_CACHED_PROJECT'

class LocalCache implements ILocalCache {
  constructor(private helpers: LocalHelpers) {}
  load(signal?: AbortSignal) {
    return this.helpers.load(LOCAL_CACHE_KEY, signal)
  }
  save(serialized: ProjectSerialized, signal?: AbortSignal): Promise<void> {
    return this.helpers.save(LOCAL_CACHE_KEY, serialized, signal)
  }
  clear() {
    return this.helpers.clear(LOCAL_CACHE_KEY)
  }
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useSignedInStateQuery } from '@/stores/user'
import { getProjectEditorRoute } from '@/router'
import { useRegisterUpdateRouteLoaded } from '@/utils/route-loading'
import {
  getProjectEditorRouteParams,
  isSameProjectIdentifier,
  toProjectIdentifier,
  type ProjectIdentifier
} from '@/utils/project-route'
import { composeQuery, useQuery } from '@/utils/query'
import { UIDetailedLoading, UIError, useConfirmDialogWithResult, useMessage } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { untilNotNull, usePageTitle } from '@/utils/utils'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { useProvideCodeEditorCtx } from '@/components/editor/code-editor/spx-code-editor'
import { usePublishProject } from '@/components/project'
import { EditingMode, type ILocalCache } from '@/components/editor/editing'
import { EditorState } from '@/components/editor/editor-state'
import { cloudHelpers } from '@/models/common/cloud'
import { localHelpers, type LocalHelpers } from '@/models/common/local'
import type { ProjectSerialized } from '@/models/project'
import { SpxProject } from '@/models/spx/project'

const props = defineProps<{
  ownerNameInput: string
  projectNameInput: string
}>()
const localCache = new LocalCache(localHelpers)

const signedInStateQuery = useSignedInStateQuery()

const router = useRouter()
const routeProjectIdentifier = computed<ProjectIdentifier>(() => ({
  owner: props.ownerNameInput,
  name: props.projectNameInput
}))

const confirm = useConfirmDialogWithResult()
const i18n = useI18n()
const { t } = i18n
const { isOnline } = useNetwork()
const m = useMessage()

const confirmOpenTargetWithAnotherInCache = (targetName: string, cachedName: string): Promise<boolean> => {
  return confirm({
    title: t({
      en: `Open project ${targetName}?`,
      zh: `打开项目 ${targetName}？`
    }),
    content: t({
      en: `There are unsaved changes for project ${cachedName}. The changes will be discarded if you continue to open project ${targetName}. Are you sure to continue?`,
      zh: `项目 ${cachedName} 存在未保存的变更，若继续打开项目 ${targetName}，项目 ${cachedName} 的变更将被丢弃。确定继续吗？`
    }),
    cancelText: t({
      en: `Open project ${cachedName}`,
      zh: `打开项目 ${cachedName}`
    })
  })
}

const stateQueryRet = useQuery(
  async (ctx) => {
    // We need to access route deps synchronously,
    // so their change will drive `useQuery` to re-fetch
    const ownerInput = routeProjectIdentifier.value.owner
    const projectNameInput = routeProjectIdentifier.value.name

    // Add `nextTick` to avoid data accessing in following code to be considered as deps, which will cause infinite loop of query fetching.
    // TODO: Refactor `useQuery` to accept deps fn explicitly to avoid such issue.
    await nextTick()

    const project = new SpxProject()
    project.disposeOnSignal(ctx.signal)
    ;(window as any).project = project // for debug purpose, TODO: remove me
    ctx.signal.throwIfAborted()
    const state = new EditorState(i18n, project, isOnline, signedInStateQuery, cloudHelpers, localCache)
    state.disposeOnSignal(ctx.signal)
    await state.editing.loadProject(
      ownerInput,
      projectNameInput,
      {
        confirmOpenTargetWithAnotherInCache,
        openProject
      },
      ctx.reporter,
      ctx.signal
    )
    state.editing.startEditing()
    state.syncWithRouter(router)
    return state
  },
  { en: 'Failed to load project', zh: '加载项目失败' }
)

const state = stateQueryRet.data
const currentProjectIdentifier = computed(() =>
  toProjectIdentifier(state.value?.project.owner, state.value?.project.name)
)

usePageTitle(() => {
  const displayName = state.value?.project.displayName ?? props.projectNameInput
  return {
    en: `Edit ${displayName}`,
    zh: `编辑 ${displayName}`
  }
})

const codeEditorQueryRet = useProvideCodeEditorCtx(stateQueryRet)

watch(currentProjectIdentifier, (nextProjectIdentifier) => {
  if (nextProjectIdentifier == null || isSameProjectIdentifier(nextProjectIdentifier, routeProjectIdentifier.value)) {
    return
  }
  const currentRoute = router.currentRoute.value
  router.replace({
    params: getProjectEditorRouteParams(currentRoute.params, nextProjectIdentifier),
    query: currentRoute.query,
    hash: currentRoute.hash
  })
})
const allQueryRet = useQuery(
  (ctx) =>
    Promise.all([
      composeQuery(ctx, stateQueryRet, [{ en: 'Loading project...', zh: '加载项目中...' }, 2]),
      composeQuery(ctx, codeEditorQueryRet, [{ en: 'Loading code editor...', zh: '加载代码编辑器中...' }, 1])
    ]),
  { en: 'Failed to load editor', zh: '加载编辑器失败' }
)

useRegisterUpdateRouteLoaded(() => !allQueryRet.isLoading.value && allQueryRet.error.value == null)

const publishProject = usePublishProject()

onMounted(async () => {
  // `?publish`
  const currentRoute = router.currentRoute.value
  const { publish, ...restQuery } = currentRoute.query
  const shouldPublish = publish !== undefined // Vue Router returns `publish: null` for `?publish`
  if (shouldPublish) {
    const s = await untilNotNull(state)
    publishProject(s.project).finally(() => {
      router.replace({ query: restQuery }) // Remove `publish` from query
    })
  }
})

onBeforeRouteLeave(async () => {
  const es = state.value
  if (es == null) return true
  const okToLeave = await checkChangesNotToBeSaved(es)
  if (!okToLeave) return false
  await ensureAutoSaved(es)
  return true
})

/**
 * Check changes that will not be saved, then confirm with user.
 * If it is OK to leave, return true, otherwise return false.
 */
async function checkChangesNotToBeSaved(es: EditorState) {
  const hasEdits = es.editing.mode === EditingMode.EffectFree && es.editing.dirty
  if (!hasEdits) return true
  return confirm({
    title: t({
      en: 'Leave editor',
      zh: '离开编辑器'
    }),
    content: t({
      en: `Project edits will not be saved if you leave now. Are you sure to leave?`,
      zh: `若现在离开，对项目的修改将不会被保存。确定要离开吗？`
    }),
    cancelText: t({
      en: 'Keep editing',
      zh: '继续编辑'
    }),
    confirmText: t({
      en: 'Leave',
      zh: '离开'
    })
  })
}

/** Ensure the changes to be auto-saved are saved */
function ensureAutoSaved(es: EditorState) {
  const editing = es.editing
  if (!editing.dirty || editing.mode !== EditingMode.AutoSave || editing.saving == null) return
  return m
    .withLoading(
      editing.saving.flush(),
      t({
        en: 'Saving project...',
        zh: '保存项目中...'
      })
    )
    .catch((e) => {
      m.error(t({ en: 'Failed to save project', zh: '保存项目失败' }))
      throw e
    })
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  const es = state.value
  if (es == null) return
  if (es.editing.dirty) event.preventDefault()
}

function preventDefaultSaveBehavior(event: KeyboardEvent) {
  const { metaKey, ctrlKey, key } = event
  // command/ctrl + s
  if ((metaKey || ctrlKey) && key.toLowerCase() === 's') {
    event.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('keydown', preventDefaultSaveBehavior)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('keydown', preventDefaultSaveBehavior)
})

function openProject(owner: string, name: string) {
  router.push(getProjectEditorRoute(owner, name))
}
</script>
