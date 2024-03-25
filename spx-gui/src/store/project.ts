import { onMounted, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { Project } from '@/model/project'
import { useUserStore } from './user'
import defaultBackdropImg from '@/assets/image/default_scene.png'
import defaultSpriteImg from '@/assets/image/default_sprite.png'
import { Sprite } from '@/model/sprite'
import { Costume } from '@/model/costume'
import { File } from '@/model/common/file'
import { Backdrop } from '@/model/backdrop'

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
    const costume = new Costume('default_costume', new File('default_sprite.png', defaultSpriteImg), {})
    const sprite = new Sprite('default_sprite', '', [costume], {})
    newProject.addSprite(sprite)
    const backdrop = new Backdrop('default_backdrop', new File('default_backdrop.png', defaultBackdropImg), {})
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
