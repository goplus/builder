<script setup lang="ts">
// This icon text input currently preserves the Account sign-in input style.
// Long term, we should decide whether it should become a UITextInput/UIInputFrame variant or stay as a separate UI primitive.
import { useFieldControlBindings } from './form/field-control-bindings'

withDefaults(
  defineProps<{
    modelValue: string
    type?: string
    placeholder: string
    iconUrl: string
    rightIconUrl?: string | null
  }>(),
  {
    type: 'text',
    rightIconUrl: null
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'right-icon-click': []
}>()

const { controlBindings, onBlur, onCompositionStart, onCompositionEnd, onInput, validationState } =
  useFieldControlBindings()

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
  onInput()
}
</script>

<template>
  <div class="w-full">
    <div class="relative w-full">
      <img :src="iconUrl" alt="" aria-hidden="true" class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
      <input
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        v-bind="controlBindings"
        class="box-border h-[50px] w-full rounded-lg border px-3 pl-11 text-base outline-none"
        :class="[
          rightIconUrl != null ? 'pr-11' : '',
          validationState === 'error' ? 'border-[#ff4d4f]' : 'border-[#cfd9de]'
        ]"
        @input="handleInput"
        @blur="onBlur"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />
      <button
        v-if="rightIconUrl != null"
        type="button"
        class="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0"
        @click="$emit('right-icon-click')"
      >
        <img :src="rightIconUrl" alt="" aria-hidden="true" class="h-full w-full" />
      </button>
    </div>
  </div>
</template>
