<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { UITabRadioGroup, UITabRadio, UISelect, UISelectOption } from '@/components/ui'
import {
  InputKind,
  type Input,
  InputType,
  type InputTypedValue,
  InputSlotKind,
  type InputSlotAccept
} from './../../common'
import BooleanInput, * as booleanInput from './BooleanInput.vue'
import IntegerInput, * as integerInput from './IntegerInput.vue'
import DecimalInput, * as decimalInput from './DecimalInput.vue'
import StringInput, * as stringInput from './StringInput.vue'
import ResourceInput, * as resourceInput from './ResourceInput.vue'
import SpxDirectionInput, * as spxDirectionInput from './SpxDirectionInput.vue'
import SpxColorInput, * as spxColorInput from './SpxColorInput.vue'
import SpxEffectKindInput, * as spxEffectKindInput from './SpxEffectKindInput.vue'
import SpxKeyInput, * as spxKeyInput from './SpxKeyInput.vue'
import SpxPlayActionInput, * as spxPlayActionInput from './SpxPlayActionInput.vue'
import SpxSpecialObjInput, * as spxSpecialObjInput from './SpxSpecialObjInput.vue'

const props = defineProps<{
  slotKind: InputSlotKind
  accept: InputSlotAccept
  input: Input
  predefinedNames: string[]
}>()

const emit = defineEmits<{
  'update:input': [input: Input]
  cancel: []
}>()

function getDefaultValue(): InputTypedValue['value'] {
  switch (props.input.type) {
    case InputType.Integer:
      return integerInput.getDefaultValue()
    case InputType.Decimal:
      return decimalInput.getDefaultValue()
    case InputType.String:
      return stringInput.getDefaultValue()
    case InputType.Boolean:
      return booleanInput.getDefaultValue()
    case InputType.SpxResourceName:
      return resourceInput.getDefaultValue()
    case InputType.SpxDirection:
      return spxDirectionInput.getDefaultValue()
    case InputType.SpxColor:
      return spxColorInput.getDefaultValue()
    case InputType.SpxEffectKind:
      return spxEffectKindInput.getDefaultValue()
    case InputType.SpxKey:
      return spxKeyInput.getDefaultValue()
    case InputType.SpxPlayAction:
      return spxPlayActionInput.getDefaultValue()
    case InputType.SpxSpecialObj:
      return spxSpecialObjInput.getDefaultValue()
    default:
      throw new Error('Unsupported type')
  }
}

const inputKinds = computed(() => {
  const kinds: InputKind[] = []
  if (props.slotKind === InputSlotKind.Value) {
    kinds.push(InputKind.InPlace)
  }
  kinds.push(InputKind.Predefined)
  return kinds
})

const inPlaceValueTitle = computed(() => {
  switch (props.accept.type) {
    case InputType.Integer:
    case InputType.Decimal:
      return { en: 'Input a number', zh: '输入数字' }
    case InputType.String:
      return { en: 'Input text', zh: '输入文本' }
    case InputType.Boolean:
      return { en: 'Input a boolean', zh: '输入布尔值' }
    case InputType.SpxResourceName:
      return { en: 'Select a resource', zh: '选择资源' } // TODO: different title for different resource types
    case InputType.SpxDirection:
      return { en: 'Select a direction', zh: '选择方向' }
    case InputType.SpxColor:
      return { en: 'Select a color', zh: '选取颜色' }
    case InputType.SpxEffectKind:
      return { en: 'Select an effect', zh: '选择特效' }
    case InputType.SpxKey:
      return { en: 'Select a key', zh: '输入按键' }
    case InputType.SpxPlayAction:
      return { en: 'Select a play action', zh: '选择播放动作' }
    case InputType.SpxSpecialObj:
      return { en: 'Select a special object', zh: '选择特殊对象' }
    default:
      return { en: 'Input a value', zh: '输入值' }
  }
})

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

function updateInput() {
  let newInput: Input
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
  emit('update:input', newInput)
}

function handleKindUpdate(newKind: InputKind) {
  kind.value = newKind
  if (newKind === InputKind.Predefined) {
    if (predefinedName.value == null && props.predefinedNames.length > 0) {
      predefinedName.value = props.predefinedNames[0]
    }
  }
  updateInput()
}

function handleInPlaceValueUpdate(newValue: InputTypedValue['value']) {
  inPlaceValue.value = newValue
  updateInput()
}

function handlePredefinedNameUpdate(name: string | null) {
  predefinedName.value = name
  updateInput()
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}
</script>

<template>
  <div class="input-helper" tabindex="0" @keydown="handleKeyDown">
    <UITabRadioGroup
      v-show="inputKinds.length > 1"
      :value="kind"
      @update:value="(v) => handleKindUpdate(v as InputKind)"
    >
      <UITabRadio :value="InputKind.InPlace">
        {{ $t(inPlaceValueTitle) }}
      </UITabRadio>
      <UITabRadio :value="InputKind.Predefined">
        {{ $t({ en: 'Choose a variable', zh: '选择变量' }) }}
      </UITabRadio>
    </UITabRadioGroup>
    <template v-if="kind === InputKind.InPlace">
      <IntegerInput
        v-if="accept.type === InputType.Integer"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
      <DecimalInput
        v-if="accept.type === InputType.Decimal"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
      <StringInput
        v-if="accept.type === InputType.String"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
      <BooleanInput
        v-if="accept.type === InputType.Boolean"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
      <ResourceInput
        v-if="accept.type === InputType.SpxResourceName"
        :context="accept.resourceContext"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
      <SpxDirectionInput
        v-if="accept.type === InputType.SpxDirection"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
      <SpxColorInput
        v-if="accept.type === InputType.SpxColor"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
      <SpxEffectKindInput
        v-if="accept.type === InputType.SpxEffectKind"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
      <SpxKeyInput
        v-if="accept.type === InputType.SpxKey"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
      <SpxPlayActionInput
        v-if="accept.type === InputType.SpxPlayAction"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
      <SpxSpecialObjInput
        v-if="accept.type === InputType.SpxSpecialObj"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
      />
    </template>
    <UISelect v-if="kind === InputKind.Predefined" :value="predefinedName" @update:value="handlePredefinedNameUpdate">
      <UISelectOption v-for="name in predefinedNames" :key="name" :value="name">
        {{ name }}
      </UISelectOption>
    </UISelect>
  </div>
</template>

<style lang="scss" scoped>
.input-helper {
  width: 344px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
