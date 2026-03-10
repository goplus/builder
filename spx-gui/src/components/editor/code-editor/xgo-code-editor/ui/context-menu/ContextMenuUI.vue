<script setup lang="ts">
import { ref, watchEffect, type CSSProperties } from 'vue'
import type { Position } from '../../common'
import { toAbsolutePosition } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import type { ContextMenuController } from '.'
import ContextMenu from './ContextMenu.vue'
import ContextMenuTrigger from './ContextMenuTrigger.vue'

const props = defineProps<{
  controller: ContextMenuController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const triggerPos = ref<CSSProperties | null>(null)

watchEffect((onCleanup) => {
  const triggerData = props.controller.triggerData
  if (triggerData == null) return
  const lineHeadPos: Position = {
    line: triggerData.selection.start.line,
    column: 1
  }
  const aPos = toAbsolutePosition(lineHeadPos, codeEditorUICtx.ui.editor)
  if (aPos == null) return
  triggerPos.value = {
    left: aPos.left + 'px',
    top: aPos.top + 'px'
  }
  onCleanup(() => {
    triggerPos.value = null
  })
})
</script>

<template>
  <ContextMenu :data="controller.menuData" :controller="controller" />
  <ContextMenuTrigger
    v-if="triggerPos != null"
    :style="triggerPos"
    :data="controller.triggerData!"
    :controller="controller"
  />
</template>
