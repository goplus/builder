<template>
  <NForm :ref="form._nFormRef" :rules="form._nFormRules" :model="form.value" @submit.prevent="handleSubmit">
    <slot></slot>
  </NForm>
</template>

<script setup lang="ts">
import { NForm } from 'naive-ui'
import type { FormCtrl } from './ctrl'

const props = defineProps<{
  form: FormCtrl
}>()

const emit = defineEmits<{
  submit: []
}>()

async function handleSubmit() {
  const { hasError } = await props.form.validate()
  if (hasError) return
  emit('submit')
}
</script>

<style lang="scss" scoped>
</style>
