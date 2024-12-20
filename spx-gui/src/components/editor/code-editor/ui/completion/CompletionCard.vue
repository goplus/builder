<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { MonacoKeyCode, type monaco } from '../../monaco'
import MarkdownView from '../markdown/MarkdownView.vue'
import CodeEditorCard from '../CodeEditorCard.vue'
import type { CompletionController, InternalCompletionItem } from '.'
import CompletionItemComp from './CompletionItem.vue'

const props = defineProps<{
  controller: CompletionController
  items: InternalCompletionItem[]
}>()

const activeIdx = ref(0)
const activeItem = computed<InternalCompletionItem | null>(() => props.items[activeIdx.value] ?? null)

function moveActiveUp() {
  const newIdx = activeIdx.value - 1
  activeIdx.value = newIdx < 0 ? props.items.length - 1 : newIdx
}

function moveActiveDown() {
  const newIdx = activeIdx.value + 1
  activeIdx.value = newIdx >= props.items.length ? 0 : newIdx
}

function prevent(e: monaco.IKeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()
}

watchEffect((onCleanup) => {
  const unlisten = props.controller.on('editorKeydown', (e) => {
    switch (e.keyCode) {
      case MonacoKeyCode.DownArrow:
        prevent(e)
        moveActiveDown()
        break
      case MonacoKeyCode.UpArrow:
        prevent(e)
        moveActiveUp()
        break
      case MonacoKeyCode.Escape:
        prevent(e)
        props.controller.stopCompletion()
        break
      case MonacoKeyCode.Enter: {
        prevent(e)
        const item = props.items[activeIdx.value]
        if (item != null) applyItem(item)
        break
      }
    }
  })
  onCleanup(unlisten)
})

function applyItem(item: InternalCompletionItem) {
  props.controller.applyCompletionItem(item)
}
</script>

<template>
  <CodeEditorCard class="completion-card">
    <ul class="list">
      <CompletionItemComp
        v-for="(item, i) in items"
        :key="i"
        :item="item"
        :active="activeIdx === i"
        @click="applyItem(item)"
      />
    </ul>
    <div v-if="activeItem != null" class="completion-item-detail">
      <MarkdownView v-bind="activeItem.documentation" />
    </div>
  </CodeEditorCard>
</template>

<style lang="scss" scoped>
.completion-card {
  width: 360px;
  max-height: 200px;
  padding: 12px 0 12px 12px;
  display: flex;
  align-items: stretch;
  font-size: 12px;
  line-height: 1.5;
}

.list {
  padding-right: 12px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}

.completion-item-detail {
  flex: 1 1 0;
  padding: 6px 12px;
  overflow-y: auto;
  scrollbar-width: thin;
  border-left: 1px solid var(--ui-color-dividing-line-2);
}
</style>
