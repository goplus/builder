<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { UIDropdown, type DropdownPos } from '@/components/ui'
import { toAbsolutePosition } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import type { CompletionController } from '.'
import CompletionCard from './CompletionCard.vue'

const props = defineProps<{
  controller: CompletionController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })

watchEffect(() => {
  const { completion, nonEmptyItems } = props.controller
  if (completion == null || nonEmptyItems == null) {
    dropdownVisible.value = false
    return
  }
  const aPos = toAbsolutePosition(completion.position, codeEditorUICtx.ui.editor)
  if (aPos == null) {
    dropdownVisible.value = false
    return
  }
  dropdownVisible.value = true
  dropdownPos.value = {
    x: aPos.left,
    y: aPos.top,
    width: 0,
    height: aPos.height
  }
})
</script>

<template>
  <UIDropdown
    :visible="dropdownVisible"
    trigger="manual"
    :pos="dropdownPos"
    placement="bottom-start"
    :offset="{ x: 0, y: 4 }"
  >
    <CompletionCard
      v-if="controller.nonEmptyItems != null"
      :items="controller.nonEmptyItems"
      :controller="controller"
    />
  </UIDropdown>
</template>

<style lang="scss" scoped></style>
