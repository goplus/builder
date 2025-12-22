<script lang="ts">
export type ParamSettingProps<T> = {
  value: T
  tips: LocaleMessage
}

type SelectorType<T> = Selector<T> & { type: 'selector' }
type ReferenceType = { type: 'reference'; value: string }
</script>

<script lang="ts" setup generic="T">
import type { LocaleMessage } from '@/utils/i18n'
import ParamReference from './ParamReference.vue'
import type { Selector } from './ParamSelector.vue'
import ParamSelector from './ParamSelector.vue'

defineProps<ParamSettingProps<T> & (SelectorType<T> | ReferenceType)>()

defineEmits<{
  'update:value': [T]
}>()
</script>

<template>
  <ParamSelector
    v-if="type === 'selector'"
    :value="value"
    :options="options"
    :tips="tips"
    @update:value="$emit('update:value', $event)"
  />
  <ParamReference v-else :value="value" :tips="tips" />
</template>

<style lang="scss" scoped></style>
