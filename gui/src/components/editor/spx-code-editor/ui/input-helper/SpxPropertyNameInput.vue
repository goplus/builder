<script lang="ts">
export function getDefaultValue() {
  return ''
}
</script>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { capture } from '@/utils/exception'
import { getCleanupSignal } from '@/utils/disposable'
import { UISelect, UISelectOption } from '@/components/ui'
import { stageCodeFilePaths } from '@/models/spx/stage'
import { useCodeEditor, useCodeEditorUICtx, getCodeFilePath, type Property } from '@/components/xgo-code-editor'

const props = defineProps<{
  value: string
}>()

const emit = defineEmits<{
  'update:value': [string]
  submit: []
}>()

const modelValue = computed({
  get() {
    return props.value
  },
  set(name) {
    emit('update:value', name)
  }
})

const { ui } = useCodeEditorUICtx()
const codeEditor = useCodeEditor()

const properties = ref<Property[]>([])

watchEffect(async (onCleanup) => {
  const textDocument = ui.activeTextDocument
  if (textDocument == null) {
    properties.value = []
    return
  }
  const codeFilePath = getCodeFilePath(textDocument.id.uri)
  const target = stageCodeFilePaths.includes(codeFilePath) ? '' : codeFilePath.replace(/\.spx$/, '')
  const signal = getCleanupSignal(onCleanup)
  try {
    const result = await codeEditor.getProperties(target, { signal, excludeNotRecommended: true })
    signal.throwIfAborted()
    properties.value = result
  } catch (e) {
    if (signal.aborted) return
    properties.value = []
    capture(e, 'Failed to get properties in SpxPropertyNameInput')
  }
})
</script>

<template>
  <UISelect v-model:value="modelValue" :style="{ alignSelf: 'stretch' }">
    <UISelectOption v-for="property in properties" :key="property.name" :value="property.name">
      {{ property.name }}
    </UISelectOption>
  </UISelect>
</template>
