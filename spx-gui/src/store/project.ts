/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-22 11:26:18
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-29 17:10:19
 * @FilePath: \spx-gui\src\store\modules\project\index.ts
 * @Description: The store of project.
 */

import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { Project, ProjectSource } from '@/class/project'
import { useUserStore } from '.'

export const useProjectStore = defineStore('project', () => {
  const project = ref(new Project())

  watch(
    // https://vuejs.org/guide/essentials/watchers.html#deep-watchers
    // According to the document, we should use `() => project.value` instead of
    // `project` to avoid deep watching, which is not expected here.
    () => project.value,
    (newProject, oldProject) => {
      oldProject.cleanup()
    }
  )

  /**
   * Load project.
   * @param id project id
   * @param source project source, default is `ProjectSource.cloud`
   */
  const loadProject = async (id: string, source: ProjectSource = ProjectSource.cloud) => {
    const newProject = new Project()
    await newProject.load(id, source, useUserStore().userInfo?.id)
    project.value = newProject
  }

  /**
   * Load project from zip file.
   * @param file the zip file
   * @param title the title, default is `file.name`
   */
  const loadFromZip = async (file: File, title?: string) => {
    const newProject = new Project()
    await newProject.loadFromZip(file, title || file.name.slice(0, file.name.lastIndexOf('.')))
    project.value = newProject
  }

  /**
   * Load blank project.
   */
  const loadBlankProject = async () => {
    const newProject = new Project()
    await newProject.loadBlankProject()
    project.value = newProject
  }

  /**
   * Initialize the project.
   */
  const init = () => {
    const lastProject = localStorage.getItem('project')
    lastProject
      ? loadProject(lastProject, ProjectSource.local).catch(loadBlankProject)
      : loadBlankProject()
  }

  init()

  return {
    project,
    loadProject,
    loadFromZip,
    loadBlankProject
  }
})
