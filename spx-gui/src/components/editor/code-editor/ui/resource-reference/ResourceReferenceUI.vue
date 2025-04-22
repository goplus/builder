<script setup lang="ts">
import { watchEffect, ref } from 'vue'
import { UIDropdown, type DropdownPos } from '@/components/ui'
import { toAbsolutePosition } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { type ResourceReferenceController } from '.'
import ResourceSelector from './selector/ResourceSelector.vue'

const props = defineProps<{
  controller: ResourceReferenceController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })

// TODO: remove resource-reference-modifying dropdown, use InputHelper instead
watchEffect(() => {
  const { modifying, selector } = props.controller
  if (modifying == null || selector == null) {
    dropdownVisible.value = false
    return
  }
  const aPos = toAbsolutePosition(modifying.range.start, codeEditorUICtx.ui.editor)
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
    <ResourceSelector
      v-if="controller.selector != null"
      :selector="controller.selector"
      @cancel="controller.stopModifying()"
      @selected="(newName) => controller.applySelected(newName)"
    />
  </UIDropdown>
</template>
