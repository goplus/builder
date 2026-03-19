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
import {
  useCodeEditor,
  useCodeEditorUICtx,
  getCodeFilePath,
  type Property,
  type TextDocument
} from '../../../xgo-code-editor'

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

async function getProperties(textDocument: TextDocument, signal?: AbortSignal) {
  const codeFilePath = getCodeFilePath(textDocument.id.uri)
  const isStage = stageCodeFilePaths.includes(codeFilePath)
  if (isStage) {
    return await codeEditor.getProperties('', signal)
  }
  const spriteName = codeFilePath.replace(/\.spx$/, '')
  const [stageProperties, spriteProperties] = await Promise.all([
    codeEditor.getProperties('', signal),
    codeEditor.getProperties(spriteName, signal)
  ])
  const spritePropertyNames = new Set(spriteProperties.map((p) => p.name))
  return [...spriteProperties, ...stageProperties.filter((p) => !spritePropertyNames.has(p.name))]
}

watchEffect(async (onCleanup) => {
  const textDocument = ui.activeTextDocument
  if (textDocument == null) {
    properties.value = []
    return
  }
  const signal = getCleanupSignal(onCleanup)
  try {
    const result = await getProperties(textDocument, signal)
    if (signal.aborted) return
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
