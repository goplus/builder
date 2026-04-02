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
  <CodeEditorCard class="flex max-h-56.75 w-111.75 items-stretch py-3 pr-0 pl-3 text-12">
    <ul class="flex min-h-0 flex-none flex-col gap-2 overflow-y-auto pr-3 [scrollbar-width:thin]">
      <CompletionItemComp
        v-for="(item, i) in items"
        :key="i"
        :item="item"
        :active="activeIdx === i"
        @click="applyItem(item)"
      />
    </ul>
    <div class="flex-[1_1_0] overflow-y-auto border-l border-dividing-line-2 px-3 py-1.5 [scrollbar-width:thin]">
      <MarkdownView v-if="activeItem?.documentation != null" v-bind="activeItem.documentation" />
    </div>
  </CodeEditorCard>
</template>
