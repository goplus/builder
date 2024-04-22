<template>
  <section class="editor-home">
    <header class="editor-header">
      <TopNav :project="project" />
    </header>
    <main v-if="userStore.userInfo" :class="['editor-main', { 'in-homepage': !projectName }]">
      <template v-if="projectName">
        <div v-if="isLoading" class="loading-wrapper">
          <NSpin size="large" />
        </div>
        <div v-else-if="error != null">
          {{ $t(error.userMessage) }}
        </div>
        <EditorContextProvider
          v-else-if="project != null"
          :project="project"
          :user-info="userStore.userInfo"
        >
          <ProjectEditor />
        </EditorContextProvider>
        <div v-else>TODO</div>
      </template>
      <template v-else>
        <div class="my-projects">
          <div class="header">
            {{ $t({ en: 'My projects', zh: '我的项目' }) }}
          </div>
          <NDivider class="divider" />
          <ProjectList :in-homepage="true" @selected="handleSelected" />
          <UIButton
            class="create-project-button"
            type="primary"
            size="large"
            icon="plus"
            @click="handleCreate"
          >
            {{ $t({ en: 'New Project', zh: '新建项目' }) }}
          </UIButton>
        </div>
      </template>
    </main>
  </section>
</template>

<script setup lang="ts">
import { watchEffect, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NSpin, NDivider } from 'naive-ui'
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
import { UIButton } from '@/components/ui'

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
const projectName = computed(
  () => router.currentRoute.value.params.projectName as string | undefined
)

const askOpenNew = (cached: Project, targetName: string) => {
  return confirm(
    `Previous project ${cached.name} has unsaved changes. Discard it and open the new project "${targetName}"?`
  )
}

const askOpenCached = (cached: Project) => {
  return confirm(
    `There is a project in the cache that has unsaved changes. Open the cached project ${cached.name}?`
  )
}

const {
  data: project,
  isLoading,
  error
} = useQuery(
  async () => {
    if (userStore.userInfo == null) return null

    let localProject: Project | null
    try {
      localProject = new Project()
      await localProject.loadFromLocalCache(LOCAL_CACHE_KEY)
    } catch (e) {
      console.warn('Failed to load project from local cache', e)
      localProject = null
      clear(LOCAL_CACHE_KEY)
    }

    if (localProject && localProject.owner !== userStore.userInfo.name) {
      // Case 4: Different user: Discard local cache
      clear(LOCAL_CACHE_KEY)
      localProject = null
    }

    // https://github.com/goplus/builder/issues/259
    // Local Cache Saving & Restoring
    if (localProject?.hasUnsyncedChanges) {
      if (!projectName.value) {
        if (askOpenCached(localProject)) {
          // Case 3: User has a project in the cache but not opening any project:
          // Open the saved project
          openProject(localProject.name!) // FIXME: name should be required?
        } else {
          // Case 3: Clear local cache
          clear(LOCAL_CACHE_KEY)
        }
        return null
      }

      if (localProject.name !== projectName.value) {
        if (askOpenNew(localProject, projectName.value)) {
          // Case 2: User has a project in the cache but not opening the project in the cache:
          // asked to open the saved project
          openProject(localProject.name!)
          return null
        }
        // Case 2 fallthrough: Let the project to be loaded from cloud
      }
    }

    if (!projectName.value) return null
    let newProject = new Project()
    await newProject.loadFromCloud(userStore.userInfo.name, projectName.value)

    if (localProject?.hasUnsyncedChanges) {
      if (newProject.version <= localProject.version && askOpenCached(localProject)) {
        // Case 1: User has a project in the cache and opening the same project:
        // asked to open the saved project
        newProject = localProject
      }
    }

    newProject.startWatchToSetHasUnsyncedChanges()
    newProject.startWatchToSyncLocalCache(LOCAL_CACHE_KEY)
    return newProject
  },
  { en: 'Load project failed', zh: '加载项目失败' }
)

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
  // FIXME: Vue's router.push does not cause the useQuery hook to re-run.
  // We have to use location.assign to force a full page reload.
  location.assign(getProjectEditorRoute(projectName))
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
  width: 1248px;
  padding-bottom: 51px;
  display: flex;
  flex-direction: column;

  .header {
    font-size: 16px;
    line-height: 26px;
    color: var(--ui-color-grey-1000);
    padding: 15px 24px;
  }

  .divider {
    margin: 0;
  }

  .create-project-button {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 28px;
    margin: 0 auto;
  }
}

.loading-wrapper {
  width: 100%;
  height: 400px;
  display: flex;
  justify-content: center;
}
</style>
