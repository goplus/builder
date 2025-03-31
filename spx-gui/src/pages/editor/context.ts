import { ref, shallowRef } from 'vue'
import type { Project } from '@/models/project'

// 使用 shallowRef 避免 Vue 深度响应式转换大型对象
export const currentProject = shallowRef<Project | null>(null)

// 是否处于编辑器页面
export const isInEditor = ref(false)

// 设置当前编辑的项目
export function setCurrentProject(project: Project | null) {
  currentProject.value = project
  isInEditor.value = project !== null
}

// 检查是否有可用的项目
export function hasActiveProject(): boolean {
  return currentProject.value !== null && !currentProject.value.isDisposed
}

// 获取当前项目
export function getCurrentProject(): Project | null {
  if (!hasActiveProject()) {
    return null
  }
  return currentProject.value
}