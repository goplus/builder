<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { useTag, type TagNode } from './index'

const { getAllTagElements } = useTag()

const props = defineProps<{
  active: boolean
}>()

let elementToNode: Map<HTMLElement, TagNode> | null = null
let nodeToPath: Map<TagNode, string> | null = null
const currentPath = ref<string | null>(null)
const currentElementRef = ref<HTMLElement | null>(null)
const currentPathRef = ref<HTMLElement | null>(null)

/**
 * find the nearest tag element of the current element from the event target
 * @param el HTMLElement
 */
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

/**
 * handle mouseover event, show the path of the current element
 * @param event MouseEvent
 */
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
        } else {
          console.error('currentElementRef is still null after nextTick')
        }
      })
    }
  } else {
    currentPath.value = null
  }
}

/**
 * create a mask to the tagged element
 * @param element HTMLElement
 */
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

/**
 * copy current path to clipboard, triggered by pressing 'c' key
 * @param e KeyboardEvent
 */
function copyToClipboard(e: KeyboardEvent) {
  if (currentPath.value && e.key === 'c') {
    navigator.clipboard.writeText(currentPath.value)
  }
}

watch(
  () => props.active,
  (newVal) => {
    if (newVal) {
      const { elementToNode: eToNode, nodeToPath: nToPath } = getAllTagElements()
      elementToNode = eToNode
      nodeToPath = nToPath
      window.addEventListener('mouseover', handleMouseOver)
      window.addEventListener('keydown', copyToClipboard)
    } else {
      window.removeEventListener('mouseover', handleMouseOver)
      window.removeEventListener('keydown', copyToClipboard)
      elementToNode = null
      nodeToPath = null
      currentPath.value = null
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('mouseover', handleMouseOver)
  window.removeEventListener('keydown', copyToClipboard)
})
</script>

<template>
  <Teleport v-if="props.active" to="body">
    <div v-if="currentPath" ref="currentElementRef" class="tagging-selector">
      <span ref="currentPathRef" class="current-path">{{ currentPath }}</span>
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
