<template>
  <form novalidate @submit.prevent="handleSubmit">
    <slot></slot>
  </form>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { FormCtrl } from './ctrl'
import { formContextKey } from './context'

const props = withDefaults(
  defineProps<{
    form: FormCtrl
    hasSuccessFeedback?: boolean
  }>(),
  {
    hasSuccessFeedback: false
  }
)

const emit = defineEmits<{
  submit: []
}>()

// `UIForm` only owns form-level orchestration; field-level timing stays in `UIFormItem`.
provide(formContextKey, props)

async function handleSubmit() {
  const { hasError } = await props.form.validate()
  if (hasError) return
  emit('submit')
}
</script>
