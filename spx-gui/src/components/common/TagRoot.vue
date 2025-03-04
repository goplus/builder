<script setup lang="ts">
import { TAG_CONTEXT_KEY, tagApi, type TagContext, type TagNode } from '@/utils/tagging'
import { reactive, provide, onMounted, onBeforeUnmount } from 'vue'

const root = reactive<TagNode>({
  name: '__root__',
  instance: null,
  children: []
})

/**
 * TODO: 这里的查找算法是简单示例，后续需要进一步优化：
 * 1. 跨层级查找
 * 2. 直接查找
 * 3. 性能优化
 * @param path
 */
const getElement = (path: string) => {
  const pathArray = path.split(' ')

  function findNode(nodes: TagNode[], remainingPath: string[]): any {
    if (!remainingPath.length) return null
    const targetName = remainingPath[0]
    const node = nodes.find((n) => n.name === targetName)

    if (!node) return null

    return remainingPath.length === 1
      ? node.instance.subTree.children[0].el
      : findNode(node.children, remainingPath.slice(1))
  }

  return findNode(root.children, pathArray)
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
