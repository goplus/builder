<script setup lang="ts">
import { ref } from 'vue'
import { UIDropdownModal, UIRadioGroup, UIRadio, UITextInput, UISelect, UISelectOption, UIDivider } from '@/components/ui'
import { ValueType, type Value } from './common'

const props = defineProps<{
  value: Value<string>
}>()

const emit = defineEmits<{
  cancel: []
  submit: [value: Value<string>]
}>()

const valueRef = ref(props.value)

const identifiers = [
  'foo',
  'bar',
  'baz',
]

function handleValueType(type: string | null) {
  if (type === ValueType.Literal) {
    valueRef.value = {
      type: ValueType.Literal,
      value: ''
    }
  } else if (type === ValueType.Identifier) {
    valueRef.value = {
      type: ValueType.Identifier,
      name: identifiers[0]
    }
  }
}

function handleLiteralValue(value: string) {
  valueRef.value = {
    type: ValueType.Literal,
    value,
  }
}

function handleIdentifierName(name: string | null) {
  if (name == null) return
  valueRef.value = {
    type: ValueType.Identifier,
    name
  }
}

function handleConfirm() {
  emit('submit', valueRef.value)
}

function handleWheel(e: WheelEvent) {
  // Prevent monaco editor from handling wheel event in completion card, see details in https://github.com/microsoft/monaco-editor/issues/2304
  e.stopPropagation()
}
</script>

<template>
  <UIDropdownModal
    class="resource-selector"
    :title="$t({ en: 'String value input', zh: '字符串值输入' })"
    style="width: 408px; max-height: 316px"
    @cancel="emit('cancel')"
    @confirm="handleConfirm"
    @wheel="handleWheel"
  >
    <UIRadioGroup :value="valueRef.type" @update:value="handleValueType">
      <UIRadio value="literal" label="Literal" />
      <UIRadio value="identifier" label="Identifier" />
    </UIRadioGroup>
    <UIDivider style="margin: 0.6em 0;" />
    <UITextInput v-if="valueRef.type === 'literal'" placeholder="Enter literal value" :value="valueRef.value" @update:value="handleLiteralValue" />
    <UISelect v-if="valueRef.type === 'identifier'" :value="valueRef.name" @update:value="handleIdentifierName">
      <UISelectOption v-for="id in identifiers" :key="id" :value="id">{{ id }}</UISelectOption>
    </UISelect>
  </UIDropdownModal>
</template>

<style lang="scss" scoped>
.resource-selector {
  overflow: hidden;
}
</style>
