<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { MonacoKeyCode, type monaco } from '../common'
import type { CompletionController, InternalCompletionItem } from '.'
import CompletionItemComp from './CompletionItem.vue'
import CompletionItemDetail from './CompletionItemDetail.vue'

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

function handleWheel(e: WheelEvent) {
  // Prevent monaco editor from handling wheel event in completion card, see details in https://github.com/microsoft/monaco-editor/issues/2304
  e.stopPropagation()
}
</script>

<template>
  <section class="completion-card" @wheel="handleWheel">
    <ul class="list">
      <CompletionItemComp
        v-for="(item, i) in items"
        :key="i"
        :item="item"
        :active="activeIdx === i"
        @click="applyItem(item)"
      />
    </ul>
    <CompletionItemDetail v-if="activeItem" class="detail" :item="activeItem" />
  </section>
</template>

<style lang="scss" scoped>
.completion-card {
  max-height: 200px;
  padding: 8px;
  display: flex;
  justify-content: stretch;
  background-color: #fff;
  border: 1px solid #333;
}

.list {
  flex: 0 0 auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}

.detail {
  width: 160px;
}
</style>
