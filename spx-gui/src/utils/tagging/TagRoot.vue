<script setup lang="ts">
import { TAG_CONTEXT_KEY, tagApi, type TagContext, type TagNode } from '.'
import { reactive, provide, onMounted, onBeforeUnmount } from 'vue'

const root = reactive<TagNode>({
  name: '__root__',
  instance: null,
  children: []
})

const getElement = (path: string) => {
  const pathTokens = path.trim().split(/\s+/)
  if (pathTokens.length === 0) return null

  // fuzzy search
  function fuzzySearch(rootNodes: TagNode[]): TagNode | null {
    /**
     * Maintain a queue as a search queue to store the nodes to be searched (node)
     * and their matching progress (index)
     */
    const queue: { node: TagNode; index: number }[] = rootNodes.map((node) => ({
      node,
      index: 0
    }))

    while (queue.length > 0) {
      const { node, index } = queue.shift()!

      // When the match is successful, if the index reaches pathTokens.length - 1,
      // it indicates a complete match and the node is returned directly.
      if (node.name === pathTokens[index]) {
        // If there is an exact match, the result is returned
        if (index === pathTokens.length - 1) {
          return node
        }
        // Otherwise, DFS is used, giving priority to going deep into the current branch,
        // which helps to quickly find the "continuous matching" path.
        queue.unshift(
          ...node.children.map((child) => ({
            node: child,
            index: index + 1
          }))
        )
      }

      // Regardless of whether the current node is matched or not,
      // its child nodes are added to the queue with the original matching progress (without incrementing the index).
      // In this way, even if the current branch is blocked, you can find the correct path from the next branch.
      queue.push(
        ...node.children.map((child) => ({
          node: child,
          index
        }))
      )
    }
    return null
  }

  const foundNode = fuzzySearch(root.children)
  return foundNode?.instance?.subTree?.children?.[0]?.el || null
}

const logTree = () => {
  console.log(root.children)
}

onMounted(() => {
  tagApi.value = {
    getElement,
    logTree
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
