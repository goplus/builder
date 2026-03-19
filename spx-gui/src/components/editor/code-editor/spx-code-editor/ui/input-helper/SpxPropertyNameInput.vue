<script lang="ts">
export function getDefaultValue() {
  return ''
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { UISelect, UISelectOption } from '@/components/ui'
import { stageCodeFilePaths } from '@/models/spx/stage'
import {
  useCodeEditor,
  useCodeEditorUICtx,
  getCodeFilePath,
  type Property,
  type TextDocument
} from '../../../xgo-code-editor'
import { capture } from '@/utils/exception'

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

async function getProperties(textDocument: TextDocument) {
  const codeFilePath = getCodeFilePath(textDocument.id.uri)
  const isStage = stageCodeFilePaths.includes(codeFilePath)
  const stageProperties = await codeEditor.getProperties('')
  if (isStage) {
    return stageProperties
  }
  const spriteName = codeFilePath.replace(/\.spx$/, '')
  const spriteProperties = await codeEditor.getProperties(spriteName)
  const spritePropertyNames = new Set(spriteProperties.map((p) => p.name))
  return [...spriteProperties, ...stageProperties.filter((p) => !spritePropertyNames.has(p.name))]
}

watch(
  () => ui.activeTextDocument,
  async (textDocument) => {
    if (textDocument == null) {
      properties.value = []
      return
    }
    try {
      properties.value = await getProperties(textDocument)
    } catch (e) {
      capture(e, 'Failed to get properties in SpxPropertyNameInput')
    }
  },
  { immediate: true }
)
</script>

<template>
  <UISelect v-model:value="modelValue" :style="{ alignSelf: 'stretch' }">
    <UISelectOption v-for="property in properties" :key="property.name" :value="property.name">
      {{ property.name }}
    </UISelectOption>
  </UISelect>
</template>
