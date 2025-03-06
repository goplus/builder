<script setup lang="ts">
import { inject, getCurrentInstance, reactive, provide, onMounted, onBeforeUnmount } from 'vue'
import { TAG_CONTEXT_KEY, type TagContext, type TagNode } from '@/utils/tagging'

const props = defineProps<{
  name: string
}>()

const parentContext = inject<TagContext>(TAG_CONTEXT_KEY)
const instance = getCurrentInstance()

const children = reactive<TagNode[]>([])

const currentContext: TagContext = {
  addChild(node: TagNode) {
    children.push(node)
  },
  removeChild(node: TagNode) {
    const index = children.indexOf(node)
    if (index > -1) children.splice(index, 1)
  }
}

provide(TAG_CONTEXT_KEY, currentContext)

const selfNode = reactive<TagNode>({
  name: props.name,
  instance,
  children
})

onMounted(() => {
  parentContext?.addChild(selfNode)
})

onBeforeUnmount(() => {
  parentContext?.removeChild(selfNode)
})
</script>

<template>
  <slot />
</template>
