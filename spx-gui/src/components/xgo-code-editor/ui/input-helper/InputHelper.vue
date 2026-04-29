<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { UITabRadioGroup, UITabRadio, UISelect, UISelectOption } from '@/components/ui'
import { InputKind, type Input, BuiltInInputType, InputSlotKind, type InputSlotAccept } from './../../common'
import type { IInputHelperProvider } from '.'

const props = defineProps<{
  slotKind: InputSlotKind
  accept: InputSlotAccept
  input: Input
  predefinedNames: string[]
  provider: IInputHelperProvider | null
}>()

const emit = defineEmits<{
  'update:input': [input: Input]
  submit: []
}>()

// `accept` from LS may change during input (which is not desired), we save a snapshot to keep it stable
const acceptSnapshot = (() => {
  let accept = props.accept
  if (accept.type === BuiltInInputType.Unknown && props.input.type !== BuiltInInputType.Unknown) {
    // If accept type is unknown, we use the input type instead to provide a in-place value input
    if (props.input.type === BuiltInInputType.ResourceName) {
      // We do not use type `ResourceName` from input, because:
      // * If `kind: InPlace`, we will not be here as LS will not give a in-place input with `type: ResourceName` for slot with `type: Unknown`
      // * If `kind: Predefined`, there's no way to get the resource context here
    } else {
      accept = { type: props.input.type }
    }
  }
  return accept
})()

const handler = computed(() => props.provider?.provideInputTypeHandler(acceptSnapshot.type) ?? null)

const inPlaceValueTitle = computed(() => {
  return handler.value?.getTitle(acceptSnapshot) ?? { en: 'Input a value', zh: '输入值' }
})

const kind = ref(InputKind.InPlace)
const inPlaceValue = shallowRef(handler.value?.getDefaultValue() ?? null) // use `any` to avoid type error in template
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

function handleInPlaceValueUpdate(newValue: unknown) {
  inPlaceValue.value = newValue
  updateInput()
}

function handlePredefinedNameUpdate(name: string | null) {
  predefinedName.value = name
  updateInput()
}
</script>

<template>
  <div class="min-w-86 flex flex-col items-center gap-5 px-4 pt-5 pb-6">
    <UITabRadioGroup class="w-78" :value="kind" @update:value="(v) => handleKindUpdate(v as InputKind)">
      <UITabRadio :value="InputKind.InPlace">
        {{ $t(inPlaceValueTitle) }}
      </UITabRadio>
      <UITabRadio :value="InputKind.Predefined">
        {{ $t({ en: 'Choose a variable', zh: '选择变量' }) }}
      </UITabRadio>
    </UITabRadioGroup>
    <template v-if="kind === InputKind.InPlace">
      <component
        :is="handler.component"
        v-if="handler != null"
        :accept="acceptSnapshot"
        :value="inPlaceValue"
        @update:value="handleInPlaceValueUpdate"
        @submit="emit('submit')"
      />
      <div v-else class="text-center leading-8 text-hint-2">
        {{ $t({ en: 'Value not supported', zh: '不支持输入值' }) }}
      </div>
    </template>
    <UISelect
      v-if="kind === InputKind.Predefined"
      class="self-stretch"
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
