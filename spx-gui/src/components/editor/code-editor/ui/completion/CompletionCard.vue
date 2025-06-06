<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { type monaco } from '../../monaco'
import MarkdownView from '../markdown/MarkdownView.vue'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import CodeEditorCard from '../CodeEditorCard.vue'
import type { CompletionController, InternalCompletionItem } from '.'
import CompletionItemComp from './CompletionItem.vue'

const props = defineProps<{
  controller: CompletionController
  items: InternalCompletionItem[]
}>()

const codeEditorUICtx = useCodeEditorUICtx()
const activeIdx = ref(0)
const activeItem = computed<InternalCompletionItem | null>(() => props.items[activeIdx.value] ?? null)

watch(activeItem, (item) => {
  if (item == null) activeIdx.value = 0
})

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
  const KeyCode = codeEditorUICtx.ui.monaco.KeyCode
  const unlisten = props.controller.on('editorKeydown', (e) => {
    switch (e.keyCode) {
      case KeyCode.DownArrow:
        prevent(e)
        moveActiveDown()
        break
      case KeyCode.UpArrow:
        prevent(e)
        moveActiveUp()
        break
      case KeyCode.Escape:
        prevent(e)
        props.controller.stopCompletion()
        break
      case KeyCode.Enter: {
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
    <div class="completion-item-detail">
      <MarkdownView v-if="activeItem?.documentation != null" v-bind="activeItem.documentation" />
    </div>
  </CodeEditorCard>
</template>

<style lang="scss" scoped>
.completion-card {
  width: 447px;
  max-height: 227px;
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
