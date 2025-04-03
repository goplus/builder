<template>
  <NSwitch v-bind="props" @update:value="(v) => emit('update:value', v)">
    <template #checked>
      <slot name="checked" />
    </template>
    <template #unchecked>
      <slot name="unchecked" />
    </template>
  </NSwitch>
</template>

<script setup lang="ts">
import { NSwitch } from 'naive-ui'

const props = defineProps<{
  value?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [boolean]
}>()
</script>

<style lang="scss" scoped>
// TODO: switch style not designed yet
</style>
