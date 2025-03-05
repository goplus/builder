<script setup lang="ts">
import { TAG_CONTEXT_KEY, tagApi, type TagContext, type TagNode } from '../../utils/tagging'
import { reactive, provide, onMounted, onBeforeUnmount } from 'vue'

const root = reactive<TagNode>({
  name: '__root__',
  instance: null,
  children: []
})

const getElement = (path: string) => {
  const pathTokens = path.trim().split(/\s+/)
  if (pathTokens.length === 0) return null

  // 模糊搜索
  function fuzzySearch(rootNodes: TagNode[]): TagNode | null {
    /**
     * 维护一个队列，作为 搜索队列，存储待搜索的节点(node)及其匹配进度(index)
     */
    const queue: { node: TagNode; index: number }[] = rootNodes.map((node) => ({
      node,
      index: 0
    }))

    while (queue.length > 0) {
      const { node, index } = queue.shift()!

      // 匹配成功时，如果 index 达到 pathTokens.length - 1，表示完全匹配，直接返回该节点。
      if (node.name === pathTokens[index]) {
        // 如果完全匹配，则返回结果
        if (index === pathTokens.length - 1) {
          return node
        }
        // 否则，采用 DFS，优先深入当前分支，这有助于快速找到“连续匹配”的路径。
        queue.unshift(
          ...node.children.map((child) => ({
            node: child,
            index: index + 1
          }))
        )
      }

      // 无论当前节点是否匹配，都将其子节点以原始匹配进度（未递增 index）的方式加入队列，
      // 这样即便当前分支走不通，也能从旁边的分支找出正确的路径
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

onMounted(() => {
  tagApi.value = {
    getElement
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
