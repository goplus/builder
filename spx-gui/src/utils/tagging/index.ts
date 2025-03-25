import { ref, type App } from 'vue'
import TagNode from './TagNode.vue'
import TagRoot from './TagRoot.vue'

export interface TagNode {
  name: string
  instance: any
  children: TagNode[]
}

export interface TagContext {
  addChild: (node: TagNode) => void
  removeChild: (node: TagNode) => void
}

export interface TagApi {
  getElement: (path: string) => HTMLElement | null
}

export const TAG_CONTEXT_KEY = Symbol('tag_context')

export const tagApi = ref<{
  getElement: (path: string) => HTMLElement | null
  getInstance: (path: string) => unknown
} | null>(null)

export function useTag() {
  const getElement = (path: string) => {
    if (!tagApi.value) {
      throw new Error('TagRoot not mounted')
    }
    return tagApi.value.getElement(path)
  }

  const getInstance = (path: string) => {
    if (!tagApi.value) {
      throw new Error('TagRoot not mounted')
    }
    return tagApi.value.getInstance(path)
  }

  return {
    getElement,
    getInstance,
  }
}

export function initTagging(app: App) {
  app.component('TagRoot', TagRoot)
  app.component('TagNode', TagNode)
}
