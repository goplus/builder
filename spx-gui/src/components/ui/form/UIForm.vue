<template>
  <form ref="formRef" novalidate @submit.prevent="handleSubmit">
    <slot></slot>
  </form>
</template>

<script setup lang="ts">
import { nextTick, provide, ref } from 'vue'
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

const formRef = ref<HTMLFormElement | null>(null)

// `UIForm` only owns form-level orchestration; field-level timing stays in `UIFormItem`.
provide(formContextKey, props)

async function handleSubmit() {
  const { hasError } = await props.form.validate()
  if (hasError) {
    await nextTick()
    formRef.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  emit('submit')
}
</script>
