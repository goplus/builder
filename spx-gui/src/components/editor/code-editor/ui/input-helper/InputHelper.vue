<script setup lang="ts" generic="T extends InputTypedValue">
import { ref, shallowRef, watch } from 'vue'
import { UIDropdownModal, UIRadioGroup, UIRadio, UISelect, UISelectOption, UIDivider } from '@/components/ui'
import { InputKind, type Input, InputType, type InputTypedValue, InputSlotKind } from './../../common'
import BooleanInput, * as booleanInput from './BooleanInput.vue'
import IntegerInput, * as integerInput from './IntegerInput.vue'
import StringInput, * as stringInput from './StringInput.vue'

const props = defineProps<{
  // TODO: provide different input UI based on `slotKind`
  slotKind: InputSlotKind
  input: Input<T>
  predefinedNames: string[]
}>()

const emit = defineEmits<{
  cancel: []
  submit: [input: Input<T>]
}>()

function getDefaultValue(): T['value'] {
  switch (props.input.type) {
    case InputType.Integer:
      return integerInput.getDefaultValue()
    case InputType.String:
      return stringInput.getDefaultValue()
    case InputType.Boolean:
      return booleanInput.getDefaultValue()
    default:
      throw new Error('Unsupported type')
  }
}

const kind = ref(InputKind.InPlace)
const inPlaceValue = shallowRef<any>(getDefaultValue()) // use `any` to avoid type error in template
const predefinedName = ref<string | null>(null)

watch(
  () => props.input,
  (input) => {
    kind.value = input.kind
    if (input.kind === InputKind.InPlace) {
      inPlaceValue.value = input.value
    } else {
      predefinedName.value = input.name
    }
  },
  { immediate: true }
)

function handleConfirm() {
  let newInput: Input<T>
  if (kind.value === InputKind.InPlace) {
    newInput = {
      kind: InputKind.InPlace,
      type: props.input.type,
      value: inPlaceValue.value
    }
  } else {
    const name = predefinedName.value
    if (name == null) return
    newInput = {
      kind: InputKind.Predefined,
      type: props.input.type,
      name
    }
  }
  emit('submit', newInput)
}
</script>

<template>
  <UIDropdownModal
    class="resource-selector"
    :title="$t({ en: 'Boolean value input', zh: '布尔值输入' })"
    style="width: 408px; max-height: 316px"
    @cancel="emit('cancel')"
    @confirm="handleConfirm"
  >
    <UIRadioGroup v-model:value="kind">
      <UIRadio :value="InputKind.InPlace" label="Value" />
      <UIRadio :value="InputKind.Predefined" label="Reference" />
    </UIRadioGroup>
    <UIDivider style="margin: 0.6em 0" />
    <template v-if="kind === InputKind.InPlace">
      <IntegerInput v-if="input.type === InputType.Integer" v-model:value="inPlaceValue" />
      <StringInput v-if="input.type === InputType.String" v-model:value="inPlaceValue" />
      <BooleanInput v-if="input.type === InputType.Boolean" v-model:value="inPlaceValue" />
    </template>
    <UISelect v-if="kind === InputKind.Predefined" v-model:value="predefinedName">
      <UISelectOption v-for="name in predefinedNames" :key="name" :value="name">{{ name }}</UISelectOption>
    </UISelect>
  </UIDropdownModal>
</template>
