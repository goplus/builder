<template>
  <NForm @submit.prevent="handleSubmit">
    <slot></slot>
  </NForm>
</template>

<script lang="ts">
export type FormInjection = {
  form: FormCtrl
  hasSuccessFeedback: boolean
}

const formInjectionKey: InjectionKey<FormInjection> = Symbol('form')

export function useForm() {
  const injected = inject(formInjectionKey)
  if (injected == null) throw new Error('useForm should be called inside of UIForm')
  return injected
}
</script>

<script setup lang="ts">
import { inject, provide, type InjectionKey } from 'vue'
import { NForm } from 'naive-ui'
import type { FormCtrl } from './ctrl'

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

provide(formInjectionKey, props)

async function handleSubmit() {
  const { hasError } = await props.form.validate()
  if (hasError) return
  emit('submit')
}
</script>

<style lang="scss" scoped></style>
