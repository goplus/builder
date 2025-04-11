<script setup lang="ts">
import { ref } from 'vue'
import { UIDropdownModal, UIRadioGroup, UIRadio, UISelect, UISelectOption, UISwitch, UIDivider } from '@/components/ui'
import { ValueType, type Value } from './common'

const props = defineProps<{
  value: Value<boolean>
}>()

const emit = defineEmits<{
  cancel: []
  submit: [value: Value<boolean>]
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
      value: true
    }
  } else if (type === ValueType.Identifier) {
    valueRef.value = {
      type: ValueType.Identifier,
      name: identifiers[0]
    }
  }
}

function handleLiteralValue(value: boolean) {
  if (value == null) return
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
    :title="$t({ en: 'Boolean value input', zh: '布尔值输入' })"
    style="width: 408px; max-height: 316px"
    @cancel="emit('cancel')"
    @confirm="handleConfirm"
    @wheel="handleWheel"
  >
    <UIRadioGroup :value="valueRef.type" @update:value="handleValueType">
      <UIRadio value="literal" label="Value" />
      <UIRadio value="identifier" label="Reference" />
    </UIRadioGroup>
    <UIDivider style="margin: 0.6em 0;" />
    <UISwitch v-if="valueRef.type === 'literal'" :value="valueRef.value" @update:value="handleLiteralValue">
      <template #checked>
        {{ $t({ en: 'True', zh: '真' }) }}
      </template>
      <template #unchecked>
        {{ $t({ en: 'False', zh: '假' }) }}
      </template>
    </UISwitch>
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
