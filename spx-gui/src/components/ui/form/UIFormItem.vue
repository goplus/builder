<template>
  <!-- TODO: margin among multiple FormItems -->
  <NFormItem ref="formItem" class="ui-form-item" :show-label="!!label" :label="label" :path="path">
    <UIFormItemInternal>
      <slot></slot>
    </UIFormItemInternal>
  </NFormItem>
  <p v-if="!!slots.tip" class="tip"><slot name="tip"></slot></p>
</template>

<script lang="ts">
export type FormItemInjection = () => InstanceType<typeof NFormItem> | undefined

const formItemInjectionKey: InjectionKey<FormItemInjection> = Symbol('form-item')

export function useFormItem() {
  const injection = inject(formItemInjectionKey)
  if (injection == null) throw new Error('useFormItem should be used inside of UIFormItem')
  return injection
}
</script>

<script setup lang="ts">
import { ref, useSlots, provide, type InjectionKey, inject } from 'vue'
import { NFormItem } from 'naive-ui'
import UIFormItemInternal from './UIFormItemInternal.vue'

defineProps<{
  label?: string
  path?: string
}>()

const slots = useSlots()

const formItem = ref<InstanceType<typeof NFormItem>>()
provide(formItemInjectionKey, () => formItem.value)
</script>

<style lang="scss" scoped>
.ui-form-item :deep(.n-form-item-feedback-wrapper) {
  line-height: 1.57143;
  &:empty {
    display: none;
  }
}

.tip {
  margin-top: 4px;
  color: var(--ui-color-hint-1);
}
</style>
