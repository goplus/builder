<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { humanizeResourceType } from '@/models/common/resource-model'
import { UITabRadioGroup, UITabRadio, UISelect, UISelectOption } from '@/components/ui'
import {
  InputKind,
  type Input,
  InputType,
  type InputTypedValue,
  InputSlotKind,
  type InputSlotAccept,
  parseResourceContextURI
} from './../../common'
import BooleanInput, * as booleanInput from './BooleanInput.vue'
import IntegerInput, * as integerInput from './IntegerInput.vue'
import DecimalInput, * as decimalInput from './DecimalInput.vue'
import StringInput, * as stringInput from './StringInput.vue'
import ResourceInput, * as resourceInput from './ResourceInput.vue'
import SpxDirectionInput, * as spxDirectionInput from './SpxDirectionInput.vue'
import SpxLayerActionInput, * as spxLayerActionInput from './SpxLayerActionInput.vue'
import SpxDirActionInput, * as spxDirActionInput from './SpxDirActionInput.vue'
import SpxColorInput, * as spxColorInput from './spx-color-input/SpxColorInput.vue'
import SpxEffectKindInput, * as spxEffectKindInput from './spx-effect-input/SpxEffectKindInput.vue'
import SpxKeyInput, * as spxKeyInput from './SpxKeyInput.vue'
import SpxPlayActionInput, * as spxPlayActionInput from './SpxPlayActionInput.vue'
import SpxSpecialObjInput, * as spxSpecialObjInput from './SpxSpecialObjInput.vue'
import SpxRotationStyleInput, * as spxRotationStyleInput from './SpxRotationStyleInput.vue'

const props = defineProps<{
  slotKind: InputSlotKind
  accept: InputSlotAccept
  input: Input
  predefinedNames: string[]
}>()

const emit = defineEmits<{
  'update:input': [input: Input]
  submit: []
}>()

// `accept` from LS may change during input (which is not desired), we save a snapshot to keep it stable
const acceptSnapshot = (() => {
  let accept = props.accept
  if (accept.type === InputType.Unknown && props.input.type !== InputType.Unknown) {
    // If accept type is unknown, we use the input type instead to provide a in-place value input
    if (props.input.type === InputType.SpxResourceName) {
      // We do not use type `SpxResourceName` from input, because:
      // * If `kind: InPlace`, we will not be here as LS will not give a in-place input with `type: SpxResourceName` for slot with `type: Unknown`
      // * If `kind: Predefined`, there's no way to get the resource context here
    } else {
      accept = { type: props.input.type }
    }
  }
  return accept
})()

function getDefaultValue(): InputTypedValue['value'] | null {
  switch (acceptSnapshot.type) {
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
    case InputType.SpxLayerAction:
      return spxLayerActionInput.getDefaultValue()
    case InputType.SpxDirAction:
      return spxDirActionInput.getDefaultValue()
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
    case InputType.SpxRotationStyle:
      return spxRotationStyleInput.getDefaultValue()
    case InputType.Unknown:
      return null
    default:
      throw new Error('Unsupported type')
  }
}

const inPlaceValueTitle = computed(() => {
  switch (acceptSnapshot.type) {
    case InputType.Integer:
    case InputType.Decimal:
      return { en: 'Input a number', zh: '输入数字' }
    case InputType.String:
      return { en: 'Input text', zh: '输入文本' }
    case InputType.Boolean:
      return { en: 'Input a boolean', zh: '输入布尔值' }
    case InputType.SpxResourceName: {
      const { type } = parseResourceContextURI(acceptSnapshot.resourceContext)
      const humanizedType = humanizeResourceType(type)
      return { en: `Select a ${humanizedType.en}`, zh: `选择${humanizedType.zh}` }
    }
    case InputType.SpxDirection:
      return { en: 'Select a direction', zh: '选择方向' }
    case InputType.SpxLayerAction:
      return { en: 'Select a layer', zh: '选择向最前/后移' }
    case InputType.SpxDirAction:
      return { en: 'Select a direction', zh: '选择向前/向后' }
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
    case InputType.SpxRotationStyle:
      return { en: 'Select a rotation style', zh: '选择旋转方式' }
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
    if (inPlaceValue.value == null) return
    newInput = {
      kind: InputKind.InPlace,
      type: acceptSnapshot.type,
      value: inPlaceValue.value
    }
  } else {
    const name = predefinedName.value
    if (name == null) return
    newInput = {
      kind: InputKind.Predefined,
      type: acceptSnapshot.type,
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

function handleInPlaceValueUpdate(newValue: InputTypedValue['value'] | null) {
  inPlaceValue.value = newValue
  updateInput()
}

function handlePredefinedNameUpdate(name: string | null) {
  predefinedName.value = name
  updateInput()
}
</script>

<template>
  <div class="input-helper">
    <UITabRadioGroup class="kind-select" :value="kind" @update:value="(v) => handleKindUpdate(v as InputKind)">
      <UITabRadio :value="InputKind.InPlace">
        {{ $t(inPlaceValueTitle) }}
      </UITabRadio>
      <UITabRadio :value="InputKind.Predefined">
        {{ $t({ en: 'Choose a variable', zh: '选择变量' }) }}
      </UITabRadio>
    </UITabRadioGroup>
    <template v-if="kind === InputKind.InPlace">
      <IntegerInput
        v-if="acceptSnapshot.type === InputType.Integer"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <DecimalInput
        v-if="acceptSnapshot.type === InputType.Decimal"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <StringInput
        v-if="acceptSnapshot.type === InputType.String"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <BooleanInput
        v-if="acceptSnapshot.type === InputType.Boolean"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <ResourceInput
        v-if="acceptSnapshot.type === InputType.SpxResourceName"
        :context="acceptSnapshot.resourceContext"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <SpxDirectionInput
        v-if="acceptSnapshot.type === InputType.SpxDirection"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <SpxLayerActionInput
        v-if="acceptSnapshot.type === InputType.SpxLayerAction"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <SpxDirActionInput
        v-if="acceptSnapshot.type === InputType.SpxDirAction"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <SpxColorInput
        v-if="acceptSnapshot.type === InputType.SpxColor"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <SpxEffectKindInput
        v-if="acceptSnapshot.type === InputType.SpxEffectKind"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <SpxKeyInput
        v-if="acceptSnapshot.type === InputType.SpxKey"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <SpxPlayActionInput
        v-if="acceptSnapshot.type === InputType.SpxPlayAction"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <SpxSpecialObjInput
        v-if="acceptSnapshot.type === InputType.SpxSpecialObj"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <SpxRotationStyleInput
        v-if="acceptSnapshot.type === InputType.SpxRotationStyle"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <div v-if="acceptSnapshot.type === InputType.Unknown" class="unknown-type">
        {{ $t({ en: 'Value not supported', zh: '不支持输入值' }) }}
      </div>
    </template>
    <UISelect
      v-if="kind === InputKind.Predefined"
      class="predefined-select"
      :placeholder="$t({ en: 'Choose a variable', zh: '选择变量' })"
      :value="predefinedName"
      @update:value="handlePredefinedNameUpdate"
    >
      <UISelectOption v-for="name in predefinedNames" :key="name" :value="name">
        {{ name }}
      </UISelectOption>
    </UISelect>
  </div>
</template>

<style lang="scss" scoped>
.input-helper {
  min-width: 344px;
  padding: 20px 16px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.kind-select {
  width: 312px;
}

.predefined-select {
  align-self: stretch;
}

.unknown-type {
  line-height: 32px;
  text-align: center;
  color: var(--ui-color-hint-2);
}
</style>
