/**
 * @file store project
 * @desc Manage current project for editor
 */

import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { Project } from '@/models/project'
import { useUserStore } from './user'
import defaultBackdropImgUrl from '@/assets/default_scene.png'
import defaultSpriteImgUrl from '@/assets/default_sprite.png'
import { Sprite } from '@/models/sprite'
import { Costume } from '@/models/costume'
import { Backdrop } from '@/models/backdrop'
import { createFileWithUrl } from '@/models/common/cloud'
import { stripExt } from '@/utils/path'
import { editProjectRouteName } from '@/router'

const localCacheKey = 'TODO_GOPLUS_BUILDER_CACHED_PROJECT'

export const useProjectStore = defineStore('project', () => {
  const userStore = useUserStore()
  const router = useRouter()

  // TODO: if it gets complex & coupled with different parts,
  // we may extract the project-managing logic into some object model like `Workspace`
  // Workspace manages projects & other states (including user info) together

  const project = ref(new Project())

  watch(
    () => {
      const route = router.currentRoute.value
      if (route.name !== editProjectRouteName) return null
      return route.params.projectName as string
    },
    async (projectName) => {
      if (projectName == null) return
      const owner = userStore.userInfo?.name
      if (owner == null) throw new Error('owner info is required')
      // TODO: UI logic to handle conflicts when there are local cache
      const newProject = new Project()
      await newProject.loadFromCloud(owner, projectName)
      newProject.syncToLocalCache(localCacheKey)
      project.value = newProject
    },
    { immediate: true }
  )

  watch(
    // https://vuejs.org/guide/essentials/watchers.html#deep-watchers
    // According to the document, we should use `() => project.value` instead of
    // `project` to avoid deep watching, which is not expected here.
    () => project.value,
    (_, oldProject) => {
      oldProject.dispose()
      ;(window as any).project = project.value // for debug purpose, TODO: remove me
    }
  )

  function openProject(projectName: string) {
    router.push({ name: editProjectRouteName, params: { projectName } })
  }

  async function openDefaultProject(name: string) {
    const owner = userStore.userInfo?.name
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

  async function openProjectWithZipFile(name: string | undefined, zipFile: globalThis.File) {
    const owner = userStore.userInfo?.name
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
    openDefaultProject,
    openProjectWithZipFile
  }
})
