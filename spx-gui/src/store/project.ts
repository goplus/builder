import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { Project } from '@/model/project'
import { useUserStore } from './user'

const localCacheKey = 'TODO_GOPLUS_BUILDER_CACHED_PROJECT'

export const useProjectStore = defineStore('project', () => {

  const userStore = useUserStore()

  const project = ref(new Project())

  watch(
    // https://vuejs.org/guide/essentials/watchers.html#deep-watchers
    // According to the document, we should use `() => project.value` instead of
    // `project` to avoid deep watching, which is not expected here.
    () => project.value,
    (_, oldProject) => {
      oldProject.dispose()
    }
  )

  async function openProject(name: string, owner = userStore.userInfo?.name) {
    // TODO: UI logic to handle conflicts when there are local cache
    if (owner == null) throw new Error('owner info is required')
    const newProject = new Project()
    await newProject.loadFromCloud(owner, name)
    newProject.syncToLocalCache(localCacheKey)
    project.value = newProject
  }

  async function openBlankProject(name: string, owner = userStore.userInfo?.name) {
    if (owner == null) throw new Error('owner info is required')
    const newProject = new Project()
    await newProject.load({ owner, name }, {})
    newProject.syncToLocalCache(localCacheKey)
    project.value = newProject
  }

  async function openProjectWithZipFile(zipFile: File, name?: string, owner = userStore.userInfo?.name) {
    if (owner == null) throw new Error('owner info is required')
    // TODO: UI logic to handle conflicts when there are local cache
    const newProject = new Project()
    await newProject.load({ owner, name }, {})
    await newProject.loadZipFile(zipFile)
    newProject.syncToLocalCache(localCacheKey)
    project.value = newProject
  }

  // TODO: use params from route

  return {
    project,
    openProject,
    openBlankProject,
    openProjectWithZipFile
  }
})
