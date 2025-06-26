<template>
  <section class="editor-home">
    <header class="editor-header">
      <EditorNavbar :project="project" :editing="editingQueryRet.data.value" />
    </header>
    <main v-if="userInfo" class="editor-main">
      <UIDetailedLoading v-if="allQueryRet.isLoading.value" :percentage="allQueryRet.progress.value.percentage">
        <span>{{ $t(allQueryRet.progress.value.desc ?? { en: 'Loading...', zh: '加载中...' }) }}</span>
      </UIDetailedLoading>
      <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
        {{ $t(allQueryRet.error.value.userMessage) }}
      </UIError>
      <EditorContextProvider
        v-else
        :project="project!"
        :user-info="userInfo"
        :runtime="runtimeQueryRet.data.value!"
        :editing="editingQueryRet.data.value!"
      >
        <ProjectEditor />
      </EditorContextProvider>
    </main>
  </section>
</template>

<script setup lang="ts">
import { watchEffect, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { Project } from '@/models/project'
import { getProjectEditorRoute } from '@/router'
import { Cancelled } from '@/utils/exception'
import { ProgressCollector, ProgressReporter } from '@/utils/progress'
import { composeQuery, useQuery } from '@/utils/query'
import { getStringParam } from '@/utils/route'
import { clear } from '@/models/common/local'
import { Runtime } from '@/models/runtime'
import { UIDetailedLoading, UIError, useConfirmDialog, useMessage } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { untilNotNull, usePageTitle } from '@/utils/utils'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { useProvideCodeEditorCtx } from '@/components/editor/code-editor/context'
import { usePublishProject } from '@/components/project'
import { useCopilotCtx } from '@/components/copilot/CopilotProvider.vue'
import { Editing, EditingMode } from '@/components/editor/editing'

const props = defineProps<{
  ownerName?: string
  projectName: string
}>()

usePageTitle(() => ({
  en: `Edit ${props.projectName}`,
  zh: `编辑 ${props.projectName}`
}))

const LOCAL_CACHE_KEY = 'XBUILDER_CACHED_PROJECT'

const userStore = useUserStore()
const userInfo = computed(() => userStore.getSignedInUser())
const copilotCtx = useCopilotCtx()

const router = useRouter()

const withConfirm = useConfirmDialog()
const { t } = useI18n()
const { isOnline } = useNetwork()
const m = useMessage()

const askToOpenTargetWithAnotherInCache = (targetName: string, cachedName: string): Promise<boolean> => {
  return new Promise((resolve) =>
    withConfirm({
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
      .then(() => {
        resolve(true)
      })
      .catch(() => {
        resolve(false)
      })
  )
}

const projectQueryRet = useQuery(
  async (ctx) => {
    let ownerName = props.ownerName
    if (ownerName == null) {
      if (userInfo.value == null) throw new Error('User not signed in') // This should not happen as the route is protected
      ownerName = userInfo.value.name
    }
    // We need to access deps (`ownerName`, `projectName`) synchronously,
    // so their change will drive `useQuery` to re-fetch
    const project = await loadProject(ownerName, props.projectName, ctx.signal, ctx.reporter)
    ;(window as any).project = project // for debug purpose, TODO: remove me
    return project
  },
  { en: 'Failed to load project', zh: '加载项目失败' }
)

const project = projectQueryRet.data

const runtimeQueryRet = useQuery(async (ctx) => {
  const project = await composeQuery(ctx, projectQueryRet)
  ctx.signal.throwIfAborted()
  const runtime = new Runtime(project)
  runtime.disposeOnSignal(ctx.signal)
  return runtime
})

if (copilotCtx.mcp.registry == null) {
  throw new Error('Copilot registry not initialized')
}

const codeEditorQueryRet = useProvideCodeEditorCtx(projectQueryRet, runtimeQueryRet, copilotCtx.mcp.registry)

const editingQueryRet = useQuery(
  async (ctx) => {
    const project = await composeQuery(ctx, projectQueryRet)
    ctx.signal.throwIfAborted()
    const editing = new Editing(project, isOnline, userInfo, LOCAL_CACHE_KEY)
    editing.disposeOnSignal(ctx.signal)
    editing.start()
    return editing
  },
  { en: 'Failed to initialize editing features', zh: '初始化编辑功能失败' }
)

const allQueryRet = useQuery(
  (ctx) =>
    Promise.all([
      composeQuery(ctx, projectQueryRet, [{ en: 'Loading project...', zh: '加载项目中...' }, 2]),
      composeQuery(ctx, runtimeQueryRet, [null, 0.1]),
      composeQuery(ctx, codeEditorQueryRet, [{ en: 'Loading code editor...', zh: '加载代码编辑器中...' }, 1]),
      composeQuery(ctx, editingQueryRet, [{ en: 'Initializing editing features...', zh: '初始化编辑功能中...' }, 0.1])
    ]),
  { en: 'Failed to load editor', zh: '加载编辑器失败' }
)

// `?publish`
if (getStringParam(router, 'publish') != null) {
  const publishProject = usePublishProject()
  onMounted(async () => {
    const p = await untilNotNull(project)
    publishProject(p)
  })
}

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

  let localProject: Project | null
  try {
    localProject = new Project()
    localProject.disposeOnSignal(signal)
    await localProject.loadFromLocalCache(LOCAL_CACHE_KEY)
  } catch (e) {
    console.warn('Failed to load project from local cache', e)
    localProject = null
    await clear(LOCAL_CACHE_KEY)
  }
  signal.throwIfAborted()
  loadFromLocalCacheReporter.report(1)

  // https://github.com/goplus/builder/issues/259
  // https://github.com/goplus/builder/issues/393
  // Local Cache Saving & Restoring
  if (localProject != null && localProject.owner !== ownerName) {
    // Case 4: Different user: Discard local cache
    await clear(LOCAL_CACHE_KEY)
    localProject = null
  }

  if (localProject != null && localProject.name !== projectName) {
    const stillOpenTarget = await askToOpenTargetWithAnotherInCache(projectName, localProject.name!)
    signal.throwIfAborted()
    if (stillOpenTarget) {
      await clear(LOCAL_CACHE_KEY)
      localProject = null
    } else {
      openProject(localProject.name!)
      throw new Cancelled('Open another project')
    }
  }

  let newProject = new Project()
  newProject.disposeOnSignal(signal)
  await newProject.loadFromCloud(ownerName, projectName, undefined, signal, loadFromCloudReporter)

  // If there is no newer cloud version, use local version without confirmation.
  // If there is a newer cloud version, use cloud version without confirmation.
  // (clear local cache if cloud version is newer)
  if (localProject != null) {
    if (newProject.version <= localProject.version) {
      newProject = localProject
    } else {
      await clear(LOCAL_CACHE_KEY)
    }
  }

  signal.throwIfAborted()
  return newProject
}

watchEffect((onCleanup) => {
  const editing = editingQueryRet.data.value
  if (editing == null) return
  const cleanup = router.beforeEach(async () => {
    if (!editing.dirty) return true
    if (editing.mode === EditingMode.EffectFree) return navigationGuardForEffectFreeMode()
    if (editing.mode === EditingMode.AutoSave) return navigationGuardForAutoSaveMode(editing)
  })

  onCleanup(cleanup)
})

function navigationGuardForAutoSaveMode(editing: Editing) {
  return withConfirm({
    title: t({
      en: 'Save changes',
      zh: '保存变更'
    }),
    content: t({
      en: 'There are changes not saved yet. You must save them to the cloud before leaving.',
      zh: '存在未保存的变更，你必须先保存到云端才能离开。'
    }),
    confirmText: t({
      en: 'Save',
      zh: '保存'
    }),
    async confirmHandler() {
      try {
        if (editing.dirty) await editing.saving?.flush()
        await clear(LOCAL_CACHE_KEY)
      } catch (e) {
        m.error(t({ en: 'Failed to save changes', zh: '保存变更失败' }))
        throw e
      }
    },
    autoConfirm: true
  }).catch(() => false)
}

function navigationGuardForEffectFreeMode() {
  return withConfirm({
    title: t({
      en: 'Discard changes',
      zh: '放弃变更'
    }),
    content: t({
      en: 'There are changes not saved yet. You can discard them and leave.',
      zh: '存在未保存的变更，你可以放弃它们并离开。'
    }),
    cancelText: t({
      en: 'Keep editing',
      zh: '继续编辑'
    }),
    confirmText: t({
      en: 'Discard changes',
      zh: '放弃变更'
    }),
    async confirmHandler() {
      await clear(LOCAL_CACHE_KEY)
    }
  }).catch(() => false)
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  const editing = editingQueryRet.data.value
  if (editing != null && editing.dirty) {
    event.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

function openProject(projectName: string) {
  router.push(getProjectEditorRoute(projectName))
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
