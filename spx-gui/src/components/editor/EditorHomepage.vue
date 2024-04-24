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

const askOpenNew = (cached: Project, targetName: string): Promise<boolean> => {
  return new Promise((resolve) =>
    withConfirm({
      title: t({
        en: 'Unsaved changes',
        zh: '未保存的更改'
      }),
      content: t({
        en: `Previous project ${cached.name} has unsaved changes. Discard it and open the new project "${targetName}"?`,
        zh: `之前的项目 ${cached.name} 有未保存的更改。放弃更改并打开新项目 "${targetName}"？`
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

const askOpenCached = (cached: Project): Promise<boolean> => {
  return new Promise((resolve) =>
    withConfirm({
      title: t({
        en: 'Unsaved changes',
        zh: '未保存的更改'
      }),
      content: t({
        en: `There is a project in the cache that has unsaved changes. Open the cached project ${cached.name}?`,
        zh: `缓存中有一个项目有未保存的更改。打开缓存的项目 ${cached.name}？`
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
    clear(LOCAL_CACHE_KEY)
  }

  // https://github.com/goplus/builder/issues/259
  // Local Cache Saving & Restoring
  if (localProject && localProject.owner !== user) {
    // Case 4: Different user: Discard local cache
    clear(LOCAL_CACHE_KEY)
    localProject = null
  }

  if (localProject?.hasUnsyncedChanges) {
    if (!projectName) {
      if (await askOpenCached(localProject)) {
        // Case 3: User has a project in the cache but not opening any project:
        // Open the saved project
        openProject(localProject.name!) // FIXME: name should be required?
      } else {
        // Case 3: Clear local cache
        clear(LOCAL_CACHE_KEY)
      }
      return null
    }

    if (localProject.name !== projectName) {
      if (await askOpenNew(localProject, projectName)) {
        // Case 2: User has a project in the cache but not opening the project in the cache:
        // asked to open the saved project
        openProject(localProject.name!)
        return null
      }
      clear(LOCAL_CACHE_KEY)
      // Case 2 fallthrough: Let the project to be loaded from cloud
    }
  }

  if (!projectName) return null
  let newProject = new Project()
  await newProject.loadFromCloud(user, projectName)

  if (localProject?.hasUnsyncedChanges) {
    if (newProject.version <= localProject.version && (await askOpenCached(localProject))) {
      // Case 1: User has a project in the cache and opening the same project:
      // asked to open the saved project
      newProject = localProject
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
  const f = (event: BeforeUnloadEvent) => {
    if (project.value?.hasUnsyncedChanges) {
      // impossible to show a custom message
      event.preventDefault()
    }
  }

  window.addEventListener('beforeunload', f)
  onCleanup(() => {
    window.removeEventListener('beforeunload', f)
  })
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
