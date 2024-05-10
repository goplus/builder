<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { inject, provide } from 'vue'
import { formItemInjectionKey as nFormItemInjectionKey } from 'naive-ui/es/_mixins/use-form-item'

const props = defineProps<{
  handleContentBlur: () => void
  handleContentInput: () => void
}>()

const nFormItemInjection = inject(nFormItemInjectionKey)
if (nFormItemInjection == null)
  throw new Error('UIFormItemInternal is expected to be used in NFormItem')

// hijack injection of NFormItem to get notified when content blur/input
provide(nFormItemInjectionKey, {
  ...nFormItemInjection,
  ...props
})
</script>
