<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { inject, provide } from 'vue'
import { formItemInjectionKey as nFormItemInjectionKey } from 'naive-ui/es/_mixins/use-form-item'
import { debounce } from '@/utils/utils'
import { useFormItem } from './UIFormItem.vue'
import { FormTrigger } from './ctrl'

defineProps<{
  label?: string
  path?: string
}>()

const nFormItemInjection = inject(nFormItemInjectionKey)
if (nFormItemInjection == null)
  throw new Error('UIFormItemInternal is expected to be used in NFormItem')

// hijack injection of NFormItem to get notified when content blur/input
provide(nFormItemInjectionKey, {
  ...nFormItemInjection,
  handleContentBlur,
  handleContentInput
})

const getNFormItem = useFormItem()

function handleContentBlur() {
  nFormItemInjection?.handleContentBlur()
  setTimeout(() => {
    getNFormItem()?.validate(FormTrigger.delayedBlur)
  }, 200)
}

const validateForDebouncedInput = debounce(() => {
  getNFormItem()?.validate(FormTrigger.debouncedInput)
}, 300)

function handleContentInput() {
  nFormItemInjection?.handleContentInput()
  validateForDebouncedInput()
}
</script>
