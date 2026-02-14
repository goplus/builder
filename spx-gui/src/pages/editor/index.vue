<template>
  <section class="editor-home">
    <header class="editor-header">
      <EditorNavbar :project="project" :state="state" />
    </header>
    <main class="editor-main">
      <UIDetailedLoading v-if="allQueryRet.isLoading.value" :percentage="allQueryRet.progress.value.percentage">
        <span>{{ $t(allQueryRet.progress.value.desc ?? { en: 'Loading...', zh: '加载中...' }) }}</span>
      </UIDetailedLoading>
      <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
        {{ $t(allQueryRet.error.value.userMessage) }}
      </UIError>
      <EditorContextProvider v-else :project="project!" :state="state!">
        <ProjectEditor />
      </EditorContextProvider>
    </main>
  </section>
</template>

<script lang="ts">
const LOCAL_CACHE_KEY = 'XBUILDER_CACHED_PROJECT'

class LocalCache implements ILocalCache {
  constructor(private helpers: LocalHelpers) {}
  load(project: IProject) {
    return this.helpers.load(project, LOCAL_CACHE_KEY)
  }
  save(project: IProject, signal?: AbortSignal) {
    return this.helpers.save(project, LOCAL_CACHE_KEY, signal)
  }
  clear() {
    return this.helpers.clear(LOCAL_CACHE_KEY)
  }
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { getSignedInUsername } from '@/stores/user'
import { SpxProject } from '@/models/spx/project'
import { getProjectEditorRoute } from '@/router'
import { Cancelled } from '@/utils/exception'
import { ProgressCollector, ProgressReporter } from '@/utils/progress'
import { useRegisterUpdateRouteLoaded } from '@/utils/route-loading'
import { composeQuery, useQuery } from '@/utils/query'
import { UIDetailedLoading, UIError, useConfirmDialogWithResult, useMessage } from '@/components/ui'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { humanizeListWithLimit, untilNotNull, usePageTitle } from '@/utils/utils'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { useProvideCodeEditorCtx } from '@/components/editor/code-editor/context'
import { usePublishProject } from '@/components/project'
import { useAgentCopilotCtx } from '@/components/agent-copilot/CopilotProvider.vue'
import { EditingMode, type ILocalCache } from '@/components/editor/editing'
import { EditorState } from '@/components/editor/editor-state'
import { cloudHelpers } from '@/models/common/cloud'
import { localHelpers, type LocalHelpers } from '@/models/common/local'
import type { IProject } from '@/models/project'

const props = defineProps<{
  ownerName: string
  projectName: string
}>()

usePageTitle(() => ({
  en: `Edit ${props.projectName}`,
  zh: `编辑 ${props.projectName}`
}))

const localCache = new LocalCache(localHelpers)

const signedInUsername = computed(() => getSignedInUsername())
const copilotCtx = useAgentCopilotCtx()

const router = useRouter()

const confirm = useConfirmDialogWithResult()
const { t } = useI18n()
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

const projectQueryRet = useQuery(
  async (ctx) => {
    // We need to access deps (`ownerName`, `projectName`) synchronously,
    // so their change will drive `useQuery` to re-fetch
    const project = await loadProject(props.ownerName, props.projectName, ctx.signal, ctx.reporter)
    ;(window as any).project = project // for debug purpose, TODO: remove me
    return project
  },
  { en: 'Failed to load project', zh: '加载项目失败' }
)

const project = projectQueryRet.data

const stateQueryRet = useQuery(async (ctx) => {
  const username = signedInUsername.value
  const project = await composeQuery(ctx, projectQueryRet)
  ctx.signal.throwIfAborted()
  const state = new EditorState(project, isOnline, username, cloudHelpers, localCache)
  state.disposeOnSignal(ctx.signal)
  state.syncWithRouter(router)
  state.editing.start()
  return state
})

const state = stateQueryRet.data

if (copilotCtx.mcp.registry == null) {
  throw new Error('Copilot registry not initialized')
}

const codeEditorQueryRet = useProvideCodeEditorCtx(projectQueryRet, stateQueryRet, copilotCtx.mcp.registry)

const allQueryRet = useQuery(
  (ctx) =>
    Promise.all([
      composeQuery(ctx, projectQueryRet, [{ en: 'Loading project...', zh: '加载项目中...' }, 2]),
      composeQuery(ctx, stateQueryRet, [{ en: 'Initializing editor...', zh: '初始化编辑器中...' }, 0.1]),
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
    const p = await untilNotNull(project)
    publishProject(p).finally(() => {
      router.replace({ query: restQuery }) // Remove `publish` from query
    })
  }
})

async function loadProject(ownerName: string, projectName: string, signal: AbortSignal, reporter: ProgressReporter) {
  const collector = ProgressCollector.collectorFor(reporter)
  const loadFromLocalCacheReporter = collector.getSubReporter(
    { en: 'Reading local cache...', zh: '读取本地缓存中...' },
    1
  )
  const loadFromCloudReporter = collector.getSubReporter(
    { en: 'Loading project from cloud...', zh: '从云端加载项目中...' },
    10
  )

  let localProject: SpxProject | null
  try {
    localProject = new SpxProject()
    localProject.disposeOnSignal(signal)
    const loaded = await localCache.load(localProject)
    if (!loaded) localProject = null
  } catch (e) {
    console.warn('Failed to load project from local cache', e)
    localProject = null
    await localCache.clear()
  }
  signal.throwIfAborted()
  loadFromLocalCacheReporter.report(1)

  // https://github.com/goplus/builder/issues/259
  // https://github.com/goplus/builder/issues/393
  // Local Cache Saving & Restoring
  if (localProject != null && localProject.owner !== ownerName) {
    // Case 4: Different user: Discard local cache
    await localCache.clear()
    localProject = null
  }

  if (localProject != null && localProject.name !== projectName) {
    const stillOpenTarget = await confirmOpenTargetWithAnotherInCache(projectName, localProject.name!)
    signal.throwIfAborted()
    if (stillOpenTarget) {
      await localCache.clear()
      localProject = null
    } else {
      openProject(localProject.owner!, localProject.name!)
      throw new Cancelled('Open another project')
    }
  }

  let newProject = new SpxProject(ownerName, projectName)
  newProject.disposeOnSignal(signal)
  // For projects not owned by the signed-in user, we prefer to load the published version.
  const preferPublishedContent = signedInUsername.value !== ownerName
  await cloudHelpers.load(newProject, preferPublishedContent, signal, loadFromCloudReporter)

  // If there is no newer cloud version, use local version without confirmation.
  // If there is a newer cloud version, use cloud version without confirmation.
  // (clear local cache if cloud version is newer)
  if (localProject != null) {
    if (newProject.version <= localProject.version) {
      newProject = localProject
    } else {
      await localCache.clear()
    }
  }

  signal.throwIfAborted()
  return newProject
}

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
  const unfinishedAssetGens = [...es.spriteGens, ...es.backdropGens]
  const hasUnfinishedAssetGens = unfinishedAssetGens.length > 0
  if (!hasEdits && !hasUnfinishedAssetGens) return true

  let changes: LocaleMessage
  const unfinishedNames = humanizeListWithLimit(
    unfinishedAssetGens.map((gen) => ({ en: gen.name, zh: gen.name })),
    3
  )
  if (hasEdits && hasUnfinishedAssetGens) {
    changes = {
      en: `Project edits and unfinished asset generations (${unfinishedNames.en})`,
      zh: `对项目的修改和未完成的素材生成（${unfinishedNames.zh}）`
    }
  } else if (hasEdits) {
    changes = { en: 'Project edits', zh: '对项目的修改' }
  } else {
    changes = {
      en: `Unfinished asset generations (${unfinishedNames.en})`,
      zh: `未完成的素材生成（${unfinishedNames.zh}）`
    }
  }
  return confirm({
    title: t({
      en: 'Leave editor',
      zh: '离开编辑器'
    }),
    content: t({
      en: `${changes.en} will not be saved if you leave now. Are you sure to leave?`,
      zh: `若现在离开，${changes.zh}将不会被保存。确定要离开吗？`
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
  if (es.editing.dirty || es.spriteGens.length > 0 || es.backdropGens.length > 0) {
    event.preventDefault()
  }
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

<style scoped lang="scss">
.editor-home {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  background-color: #e9fcff; // TODO: define as UI vars
}

.editor-header {
  flex: 0 0 auto;
}

.editor-main {
  flex: 1 1 0;
  display: flex;
  gap: var(--ui-gap-middle);
  padding: 16px;
}
</style>
