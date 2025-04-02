import { ref, type App } from 'vue'
import TagNode from './TagNode.vue'
import TagRoot from './TagRoot.vue'

/**
 * Tag node.
 * @property name - The name of the tag.
 * @property instance - The instance of the tag.
 * @property children - The children of the tag.
 */
export interface TagNode {
  name: string
  instance: any
  children: TagNode[]
}

/**
 * Context for a tag node.
 * @property addChild - Add a child node to the current node, it will happen when the child node is mounted.
 * @property removeChild - Remove a child node from the current node, it will happen when the child node is unmounted.
 */
export interface TagContext {
  addChild: (node: TagNode) => void
  removeChild: (node: TagNode) => void
}

/**
 * Tag context key, used to get the tag context from the component.
 */
export const TAG_CONTEXT_KEY = Symbol('tag_context')

/**
 * Tag root key, used to get api from the tag root component.
 */
export const tagApi = ref<{
  getElement: (path: string) => HTMLElement | null
  getInstance: (path: string) => unknown
  getAllTagElements: () => any
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

  const getAllTagElements = () => {
    if (!tagApi.value) {
      throw new Error('TagRoot not mounted')
    }
    return tagApi.value.getAllTagElements()
  }

  return {
    getElement,
    getInstance,
    getAllTagElements
  }
}

/**
 * Initialize the tagging system.
 * @param app
 * @example
 * ```ts
 * import { initTagging } from './utils/tagging'
 *
 * initTagging(app)
 * ```
 */
export function initTagging(app: App) {
  app.component('TagRoot', TagRoot)
  app.component('TagNode', TagNode)
}
