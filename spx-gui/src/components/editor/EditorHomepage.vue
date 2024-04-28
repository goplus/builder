<template>
  <section class="editor-home">
    <header class="editor-header">
      <TopNav :project="project" />
    </header>
    <main v-if="userStore.userInfo" :class="['editor-main', { 'in-homepage': !projectName }]">
      <template v-if="projectName">
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
      </template>
      <template v-else>
        <div class="my-projects">
          <div class="header">
            {{ $t({ en: 'My projects', zh: '我的项目' }) }}
          </div>
          <UIDivider />
          <ProjectList :in-homepage="true" @selected="handleSelected" />
          <div class="create-project-button">
            <UIButton type="primary" size="large" icon="plus" @click="handleCreate">
              {{ $t({ en: 'New Project', zh: '新建项目' }) }}
            </UIButton>
          </div>
        </div>
      </template>
    </main>
  </section>
</template>

<script setup lang="ts">
import { watchEffect, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { ProjectData } from '@/apis/project'
import { useUserStore } from '@/stores'
import { Project } from '@/models/project'
import TopNav from '@/components/top-nav/TopNav.vue'
import ProjectList from '@/components/project/ProjectList.vue'
import { useCreateProject } from '@/components/project'
import { getProjectEditorRoute } from '@/router'
import { useQuery } from '@/utils/exception'
import EditorContextProvider from './EditorContextProvider.vue'
import ProjectEditor from './ProjectEditor.vue'
import { clear } from '@/models/common/local'
import { UIButton, UIDivider, UILoading, UIError, useConfirmDialog } from '@/components/ui'
import { useI18n } from '@/utils/i18n'

const LOCAL_CACHE_KEY = 'GOPLUS_BUILDER_CACHED_PROJECT'

const userStore = useUserStore()
watchEffect(() => {
  // This will be called on mount and whenever userStore changes,
  // which are the cases when userStore.signOut() is called
  if (!userStore.hasSignedIn()) {
    userStore.signInWithRedirection()
  }
})

const router = useRouter()
const createProject = useCreateProject()

const withConfirm = useConfirmDialog()
const { t } = useI18n()

const projectName = computed(
  () => router.currentRoute.value.params.projectName as string | undefined
)

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
    return loadProject(userStore.userInfo?.name, projectName.value)
  },
  { en: 'Load project failed', zh: '加载项目失败' }
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

  newProject.startWatchToSetHasUnsyncedChanges()
  newProject.startWatchToSyncLocalCache(LOCAL_CACHE_KEY)
  return newProject
}

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
  const cleanup = router.beforeEach((to, from, next) => {
    if (project.value?.hasUnsyncedChanges) {
      withConfirm({
        title: t({
          en: 'Save changes?',
          zh: '保存变更？'
        }),
        content: t({
          en: 'There are changes not saved yet. Do you want to save them?',
          zh: '存在未保存的变更，要保存吗？'
        }),
        cancelText: t({
          en: 'Discard changes',
          zh: '不保存'
        }),
        confirmText: t({
          en: 'Save',
          zh: '保存'
        }),
        async confirmHandler() {
          await project.value!.saveToCloud()
        }
      }).finally(async () => {
        await clear(LOCAL_CACHE_KEY)
        next()
      })
    } else {
      next()
    }
  })

  onCleanup(cleanup)
})

function openProject(projectName: string) {
  router.push(getProjectEditorRoute(projectName))
}

function handleSelected(project: ProjectData) {
  openProject(project.name)
}

async function handleCreate() {
  const newProject = await createProject()
  openProject(newProject.name)
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

.editor-main.in-homepage {
  padding: 25px;
  display: flex;
  justify-content: center;
  background-color: var(--ui-color-grey-100);
}

.my-projects {
  width: 1208px;
  padding-bottom: 51px;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;

  .header {
    font-size: 16px;
    line-height: 26px;
    color: var(--ui-color-title);
    padding: 15px 24px;
  }

  .create-project-button {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 28px;
    display: flex;
    justify-content: center;
  }
}
</style>
