import { onMounted, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useRoute } from 'vue-router'
import { Project } from '@/models/project'
import { useUserStore } from './user'
import defaultBackdropImgUrl from '@/assets/default_scene.png'
import defaultSpriteImgUrl from '@/assets/default_sprite.png'
import { Sprite } from '@/models/sprite'
import { Costume } from '@/models/costume'
import { Backdrop } from '@/models/backdrop'
import { createFileWithUrl } from '@/models/common/cloud'
import { stripExt } from '@/utils/path'

const localCacheKey = 'TODO_GOPLUS_BUILDER_CACHED_PROJECT'

export const useProjectStore = defineStore('project', () => {
  const userStore = useUserStore()
  const route = useRoute()

  // TODO: if it gets complex & coupled with different parts,
  // we may extract the project-managing logic into some object model like `Workspace`
  // Workspace manages projects & other states (including user info) together

  const project = ref(new Project())

  watch(
    () => route.params.projectName,
    (name) => {
      if (!name) return
      const owner = userStore.userInfo?.name
      if (!owner) return
      openProject(owner, name as string)
    }
  )

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

  async function openProject(owner: string, name: string) {
    // TODO: UI logic to handle conflicts when there are local cache
    if (owner == null) throw new Error('owner info is required')
    const newProject = new Project()
    await newProject.loadFromCloud(owner, name)
    newProject.syncToLocalCache(localCacheKey)
    project.value = newProject
  }

  async function openBlankProject(owner = userStore.userInfo?.name, name: string) {
    if (owner == null) throw new Error('owner info is required')
    const newProject = new Project()
    await newProject.load({ owner, name }, {})
    newProject.syncToLocalCache(localCacheKey)
    project.value = newProject
  }

  async function openDefaultProject(owner = userStore.userInfo?.name, name: string) {
    if (owner == null) throw new Error('owner info is required')
    const newProject = new Project()
    await newProject.load({ owner, name }, {})
    const costume = new Costume(
      'default_costume',
      createFileWithUrl('default_sprite.png', defaultSpriteImgUrl),
      {}
    )
    const sprite = new Sprite('default_sprite', '', [costume], {})
    newProject.addSprite(sprite)
    const backdrop = new Backdrop(
      'default_backdrop',
      createFileWithUrl('default_backdrop.png', defaultBackdropImgUrl),
      {}
    )
    newProject.stage.addBackdrop(backdrop)
    newProject.syncToLocalCache(localCacheKey)
    project.value = newProject
  }

  async function openProjectWithZipFile(
    owner = userStore.userInfo?.name,
    name: string | undefined,
    zipFile: globalThis.File
  ) {
    if (owner == null) throw new Error('owner info is required')
    // TODO: UI logic to handle conflicts when there are local cache
    const newProject = new Project()
    await newProject.load({ owner, name: name ?? stripExt(zipFile.name) }, {})
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
