<template>
  <section class="editor-home">
    <header class="editor-header">
      <EditorNavbar :project="project" />
    </header>
    <main v-if="userStore.userInfo" class="editor-main">
      <UILoading v-if="isLoading" />
      <UIError v-else-if="error != null" :retry="refetch">
        {{ $t(error.userMessage) }}
      </UIError>
      <EditorContextProvider
        v-else-if="project != null"
        :project="project"
        :user-info="userStore.userInfo"
      >
        <ProjectEditor />
      </EditorContextProvider>
    </main>
  </section>
</template>

<script setup lang="ts">
import { watchEffect, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { AutoSaveMode, Project } from '@/models/project'
import { getProjectEditorRoute } from '@/router'
import { useQuery } from '@/utils/exception'
import { clear } from '@/models/common/local'
import { UILoading, UIError, useConfirmDialog, useMessage } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'

const props = defineProps<{
  projectName: string
}>()

const LOCAL_CACHE_KEY = 'GOPLUS_BUILDER_CACHED_PROJECT'

// TODO: move this to some outer position
const userStore = useUserStore()
watchEffect(() => {
  // This will be called on mount and whenever userStore changes,
  // which are the cases when userStore.signOut() is called
  if (!userStore.isSignedIn) {
    userStore.signInWithRedirection()
  }
})

const router = useRouter()

const withConfirm = useConfirmDialog()
const { t } = useI18n()
const { isOnline } = useNetwork()
const m = useMessage()

const askToOpenTargetWithAnotherInCache = (
  targetName: string,
  cachedName: string
): Promise<boolean> => {
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

const askToOpenCachedVersionForCurrent = (cachedName: string): Promise<boolean> => {
  return new Promise((resolve) =>
    withConfirm({
      title: t({
        en: 'Restore unsaved changes?',
        zh: '恢复未保存的变更？'
      }),
      content: t({
        en: `You have unsaved changes for project ${cachedName}. Do you want to open project ${cachedName} and restore them?`,
        zh: `项目 ${cachedName} 存在未保存的变更，要打开项目 ${cachedName} 并恢复未保存的变更吗？`
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

const {
  data: project,
  isLoading,
  error,
  refetch
} = useQuery(
  () => {
    // We need to read `userStore.userInfo.name` & `projectName.value` synchronously,
    // so their change will drive `useQuery` to re-fetch
    return loadProject(userStore.userInfo?.name, props.projectName)
  },
  { en: 'Failed to load project', zh: '加载项目失败' }
)

async function loadProject(user: string | undefined, projectName: string | undefined) {
  if (user == null) return null

  let localProject: Project | null
  try {
    localProject = new Project()
    await localProject.loadFromLocalCache(LOCAL_CACHE_KEY)
  } catch (e) {
    console.warn('Failed to load project from local cache', e)
    localProject = null
    await clear(LOCAL_CACHE_KEY)
  }

  // https://github.com/goplus/builder/issues/259
  // https://github.com/goplus/builder/issues/393
  // Local Cache Saving & Restoring
  if (localProject && localProject.owner !== user) {
    // Case 4: Different user: Discard local cache
    await clear(LOCAL_CACHE_KEY)
    localProject = null
  }

  if (localProject?.hasUnsyncedChanges) {
    if (!projectName) {
      if (await askToOpenCachedVersionForCurrent(localProject.name!)) {
        // Case 3: User has a project in the cache but not opening any project:
        // Open the saved project
        openProject(localProject.name!) // FIXME: name should be required?
      } else {
        // Case 3: Clear local cache
        await clear(LOCAL_CACHE_KEY)
        localProject = null
      }
      return null
    }

    if (localProject.name !== projectName) {
      if (await askToOpenTargetWithAnotherInCache(projectName, localProject.name!)) {
        await clear(LOCAL_CACHE_KEY)
        localProject = null
      } else {
        openProject(localProject.name!)
        return null
      }
    }
  }

  if (!projectName) return null
  let newProject = new Project()
  await newProject.loadFromCloud(user, projectName)

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
  return newProject
}

// watch for online <-> offline switches, and set autoSaveMode accordingly
function setProjectAutoSaveMode(project: Project | null) {
  project?.setAutoSaveMode(isOnline.value ? AutoSaveMode.Cloud : AutoSaveMode.LocalCache)
}
watch(isOnline, () => setProjectAutoSaveMode(project.value))

watch(
  // https://vuejs.org/guide/essentials/watchers.html#deep-watchers
  // According to the document, we should use `() => project.value` instead of
  // `project` to avoid deep watching, which is not expected here.
  () => project.value,
  (_, oldProject) => {
    oldProject?.dispose()
    ;(window as any).project = project.value // for debug purpose, TODO: remove me
  }
)

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
