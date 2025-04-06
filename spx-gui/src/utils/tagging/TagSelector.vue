<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useTag, type TagNode } from './index'

const { getAllTagElements } = useTag()

const emit = defineEmits<{
  (e: 'selected', path: string): void
}>()

let elementToNode: Map<HTMLElement, TagNode> | null = null
let nodeToPath: Map<TagNode, string> | null = null
const currentPath = ref<string | null>(null)
const currentElementRef = ref<HTMLElement | null>(null)

function findNearestTagElement(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el
  while (current) {
    if (elementToNode?.has(current)) {
      return current
    }
    current = current.parentElement
  }
  return null
}

function handleMouseOver(event: MouseEvent) {
  const target = event.target as HTMLElement
  const tagElement = findNearestTagElement(target)
  if (tagElement) {
    const node = elementToNode?.get(tagElement)
    if (node) {
      currentPath.value = nodeToPath?.get(node) || '未知路径'
      nextTick(() => {
        if (currentElementRef.value) {
          createMaskToTaggedElement(tagElement)
        }
      })
    }
  } else {
    currentPath.value = null
  }
}

function handleClick(event: MouseEvent) {
  event.stopPropagation()
  const target = event.target as HTMLElement
  const tagElement = findNearestTagElement(target)
  if (tagElement) {
    const node = elementToNode?.get(tagElement)
    if (node) {
      const path = nodeToPath?.get(node) || 'unknown path'
      if (event.altKey) {
        currentPath.value = path
        emit('selected', path)
      } else {
        const onClickHandler = node.instance?.subTree?.children[0]?.props?.onClick
        if (onClickHandler) {
          nextTick(() => {
            onClickHandler()
          })
        } else {
          console.log('No onClick handler found on the component.')
        }
      }
    }
  }
}

function createMaskToTaggedElement(element: HTMLElement | null) {
  if (!element) return
  const { left, top, width, height } = element.getBoundingClientRect()
  Object.assign(currentElementRef.value!.style, {
    left: `${left - 6}px`,
    top: `${top - 6}px`,
    width: `${width + 12}px`,
    height: `${height + 12}px`
  })
}

onMounted(() => {
  const { elementToNode: eToNode, nodeToPath: nToPath } = getAllTagElements()
  elementToNode = eToNode
  nodeToPath = nToPath
  window.addEventListener('mouseover', handleMouseOver)
  window.addEventListener('click', handleClick, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('mouseover', handleMouseOver)
  window.removeEventListener('click', handleClick, true)
  elementToNode = null
  nodeToPath = null
  currentPath.value = null
})
</script>

<template>
  <Teleport to="body">
    <div v-if="currentPath" ref="currentElementRef" class="tagging-selector">
      <span class="current-path">{{ currentPath }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
.tagging-selector {
  position: fixed;
  border: 2px solid #07c0cf;
  border-radius: 5px;
  border-top-left-radius: 0;
  background: rgba(7, 192, 207, 0.5);
  pointer-events: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.current-path {
  color: white;
  position: absolute;
  bottom: 100%;
  left: -2px;
  background: rgba(7, 192, 207);
  border: 2px solid #07c0cf;
  white-space: nowrap;
  padding: 2px 4px;
  border-radius: 4px;
  border-bottom-left-radius: 0;
}
</style>
