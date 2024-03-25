import { onMounted, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { Project } from '@/models/project'
import { useUserStore } from './user'
import defaultBackdropImgUrl from '@/assets/image/default_scene.png'
import defaultSpriteImgUrl from '@/assets/image/default_sprite.png'
import { Sprite } from '@/models/sprite'
import { Costume } from '@/models/costume'
import { Backdrop } from '@/models/backdrop'
import { createFileWithUrl } from '@/models/common/cloud'

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
      ;(window as any).project = project.value // TODO: remove me
    }
  )

  onMounted(async () => {
    // TODO: use params from route
    await openDefaultProject('default', 'TODO')
  })

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

  async function openDefaultProject(name: string, owner = userStore.userInfo?.name) {
    if (owner == null) throw new Error('owner info is required')
    const newProject = new Project()
    await newProject.load({ owner, name }, {})
    const costume = new Costume('default_costume', createFileWithUrl('default_sprite.png', defaultSpriteImgUrl), {})
    const sprite = new Sprite('default_sprite', '', [costume], {})
    newProject.addSprite(sprite)
    const backdrop = new Backdrop('default_backdrop', createFileWithUrl('default_backdrop.png', defaultBackdropImgUrl), {})
    newProject.stage.addBackdrop(backdrop)
    newProject.syncToLocalCache(localCacheKey)
    project.value = newProject
  }

  async function openProjectWithZipFile(zipFile: globalThis.File, name?: string, owner = userStore.userInfo?.name) {
    if (owner == null) throw new Error('owner info is required')
    // TODO: UI logic to handle conflicts when there are local cache
    const newProject = new Project()
    await newProject.load({ owner, name }, {})
    await newProject.loadZipFile(zipFile)
    newProject.syncToLocalCache(localCacheKey)
    project.value = newProject
  }

  return {
    project,
    openProject,
    openBlankProject,
    openProjectWithZipFile
  }
})
