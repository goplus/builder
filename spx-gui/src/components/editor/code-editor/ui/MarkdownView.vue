<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, type LocaleMessage } from '@/utils/i18n'

const props = defineProps<{
  value: string | LocaleMessage
}>()

const i18n = useI18n()
const rendered = computed(() => {
  const value = props.value
  // TODO:
  // * markdown renderer
  // * basic / advanced support
  if (typeof value === 'string') {
    return value
  }
  return i18n.t(value)
})
</script>

<template>
  <div class="markdown-view">
    {{ rendered }}
  </div>
</template>

<style lang="scss" scoped></style>
