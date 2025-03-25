<script setup lang="ts">
import { TAG_CONTEXT_KEY, tagApi, type TagContext, type TagNode } from '.'
import { reactive, provide, onMounted, onBeforeUnmount } from 'vue'

const root = reactive<TagNode>({
  name: '__root__',
  instance: null,
  children: []
})

/**
 * Perform a fuzzy search to find a node based on `pathTokens`.
 * A queue is used to store nodes being searched (`node`)
 * and their matching progress (`index`).
 */
const fuzzySearch = (rootNodes: TagNode[], pathTokens: string[]): TagNode | null => {
  const queue: { node: TagNode; index: number }[] = rootNodes.map((node) => ({
    node,
    index: 0
  }))

  while (queue.length > 0) {
    const { node, index } = queue.shift()!

    // If the current node matches the token at `index`
    if (node.name === pathTokens[index]) {
      // If this is the last token, return the matched node
      if (index === pathTokens.length - 1) {
        return node
      }

      // Use Depth-First Search (DFS) to prioritize deeper matches
      queue.unshift(
        ...node.children.map((child) => ({
          node: child,
          index: index + 1
        }))
      )
    }

    // Add all child nodes to the queue with the same matching progress.
    // This ensures that if one branch fails, we can still find a match elsewhere.
    queue.push(
      ...node.children.map((child) => ({
        node: child,
        index
      }))
    )
  }
  return null
}

const handleFound = (path: string) => {
  const pathTokens = path.trim().split(/\s+/)
  if (pathTokens.length === 0) return null

  const foundNode = fuzzySearch(root.children, pathTokens)
  return foundNode
}

/**
 * Retrieve the root HTML element of a matched component.
 * Returns `null` if no match is found.
 */
const getElement = (path: string) => {
  const foundNode = handleFound(path)
  return foundNode?.instance?.subTree?.children?.[0]?.el || null
}

/**
 * Retrieve the component instance.
 * The instance object contains:
 * - `children`: The child nodes of the component.
 * - `ctx`: The component's context.
 * - `el`: The root element of the component.
 * - `props`: The component's props.
 * - `type`: The component definition (`Component.name` or `HTMLElement.name`).
 * - `ref`: Refs used in the component.
 * Returns `null` if no match is found.
 */
const getInstance = (path: string) => {
  const foundNode = handleFound(path)
  return foundNode?.instance?.subTree?.children?.[0] || null
}

onMounted(() => {
  tagApi.value = {
    getElement,
    getInstance
  }
})

onBeforeUnmount(() => {
  tagApi.value = null
})

const context: TagContext = {
  addChild(node: TagNode) {
    root.children.push(node)
  },
  removeChild(node: TagNode) {
    const index = root.children.indexOf(node)
    if (index > -1) root.children.splice(index, 1)
  }
}

provide(TAG_CONTEXT_KEY, context)
</script>

<template>
  <slot />
</template>
