<template>
  <section class="editor-home">
    <header class="editor-header">
      <EditorNavbar :project="project" />
    </header>
    <main v-if="userInfo" class="editor-main">
      <UIDetailedLoading v-if="allQueryRet.isLoading.value" :percentage="allQueryRet.progress.value.percentage">
        <span>{{ $t(allQueryRet.progress.value.desc ?? { en: 'Loading...', zh: '加载中...' }) }}</span>
      </UIDetailedLoading>
      <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
        {{ $t(allQueryRet.error.value.userMessage) }}
      </UIError>
      <EditorContextProvider v-else :project="project!" :runtime="runtimeQueryRet.data.value!" :user-info="userInfo">
        <ProjectEditor />
      </EditorContextProvider>
    </main>
  </section>
</template>

<script setup lang="ts">
import { watchEffect, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { AutoSaveMode, Project } from '@/models/project'
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

const props = defineProps<{
  projectName: string
}>()

usePageTitle(() => ({
  en: `Edit ${props.projectName}`,
  zh: `编辑 ${props.projectName}`
}))

const LOCAL_CACHE_KEY = 'GOPLUS_BUILDER_CACHED_PROJECT'

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
    if (userInfo.value == null) throw new Error('User not signed in') // This should not happen as the route is protected
    // We need to read `userInfo.value?.name` & `projectName.value` synchronously,
    // so their change will drive `useQuery` to re-fetch
    const project = await loadProject(userInfo.value.name, props.projectName, ctx.signal, ctx.reporter)
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

const allQueryRet = useQuery(
  (ctx) =>
    Promise.all([
      composeQuery(ctx, projectQueryRet, [{ en: 'Loading project...', zh: '加载项目中...' }, 2]),
      composeQuery(ctx, runtimeQueryRet, [null, 0.1]),
      composeQuery(ctx, codeEditorQueryRet, [{ en: 'Loading code editor...', zh: '加载代码编辑器中...' }, 1])
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

async function loadProject(user: string, projectName: string, signal: AbortSignal, reporter: ProgressReporter) {
  const collector = ProgressCollector.collectorFor(reporter)
  const loadFromLocalCacheReporter = collector.getSubReporter(
    { en: 'Reading local cache...', zh: '读取本地缓存中...' },
    1
  )
  const loadFromCloudReporter = collector.getSubReporter(
    { en: 'Loading project from cloud...', zh: '从云端加载项目中...' },
    10
  )
  const startEditingReporter = collector.getSubReporter(
    { en: 'Initializing editing features...', zh: '初始化编辑功能中...' },
    1
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
  if (localProject != null && localProject.owner !== user) {
    // Case 4: Different user: Discard local cache
    await clear(LOCAL_CACHE_KEY)
    localProject = null
  }

  if (localProject != null && localProject.name !== projectName && localProject.hasUnsyncedChanges) {
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
  await newProject.loadFromCloud(user, projectName, undefined, signal, loadFromCloudReporter)

  // If there is no newer cloud version, use local version without confirmation.
  // If there is a newer cloud version, use cloud version without confirmation.
  // (clear local cache if cloud version is newer)
  if (localProject?.hasUnsyncedChanges) {
    if (newProject.version <= localProject.version) {
      newProject = localProject
    } else {
      await clear(LOCAL_CACHE_KEY)
    }
  }

  setProjectAutoSaveMode(newProject)
  await newProject.startEditing(LOCAL_CACHE_KEY)
  signal.throwIfAborted()
  startEditingReporter.report(1)

  return newProject
}

// watch for online <-> offline switches, and set autoSaveMode accordingly
function setProjectAutoSaveMode(project: Project | null) {
  project?.setAutoSaveMode(isOnline.value ? AutoSaveMode.Cloud : AutoSaveMode.LocalCache)
}
watch(isOnline, () => setProjectAutoSaveMode(project.value))

watchEffect((onCleanup) => {
  const cleanup = router.beforeEach(async () => {
    if (!project.value?.hasUnsyncedChanges) return true
    try {
      await withConfirm({
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
            if (project.value?.hasUnsyncedChanges) await project.value!.saveToCloud()
            await clear(LOCAL_CACHE_KEY)
          } catch (e) {
            m.error(t({ en: 'Failed to save changes', zh: '保存变更失败' }))
            throw e
          }
        },
        autoConfirm: true
      })
      return true
    } catch {
      return false
    }
  })

  onCleanup(cleanup)
})

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (project.value?.hasUnsyncedChanges) {
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
