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
import { debounce } from '@/util/global'
export const useProjectStore = defineStore('project', () => {
  /**
   * The project. You can use `project.value` to get it.
   */
  const project = ref(new Project())
  project.value.loadBlankProject()

  // TODO: Consider moving the autosave behaviour into the class project in the future, when non-spx-gui scenarios like widgets are supported.

  /**
   * Remove original project and save the project to storage.
   */
  const saveLocal = debounce(async () => {
    console.log('project changed', project.value)
    await project.value.removeLocal()
    await project.value.saveLocal()
  })

  /**
   * while project changed, save it to storage automatically.
   */
  watch(() => project.value, saveLocal, { deep: true })

  /**
   * Load project.
   * @param id project id
   * @param source project source, default is `ProjectSource.cloud`
   */
  const loadProject = async (id: string, source: ProjectSource = ProjectSource.cloud) => {
    const newProject = new Project()
    await newProject.load(id, source)
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

  return {
    project,
    loadProject,
    loadFromZip
  }
})
