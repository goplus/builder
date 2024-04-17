<template>
  <div
    class="ui-menu-item"
    :class="{ disabled: disabled, interactive: interactive }"
    @click="handleClick"
  >
    <div v-if="hasSlotIcon" class="icon">
      <slot name="icon"></slot>
    </div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { inject, useSlots } from 'vue'
import { disabledKey } from './UIMenu.vue'

withDefaults(
  defineProps<{
    interactive?: boolean
  }>(),
  {
    interactive: true
  }
)

const emit = defineEmits<{
  click: [e: MouseEvent]
}>()

const slots = useSlots()
const hasSlotIcon = !!slots['icon']
const disabled = inject(disabledKey)

function handleClick(e: MouseEvent) {
  if (disabled?.value) return
  emit('click', e)
}
</script>

<style lang="scss" scoped>
$line-height: 24px; // TODO: ui var?

.ui-menu-item {
  padding: 8px 20px 8px 12px;
  line-height: $line-height;
  display: flex;
  gap: 6px;

  &.disabled {
    cursor: not-allowed;
  }

  &.interactive:not(.disabled) {
    cursor: pointer;

    &:hover {
      // TODO: recheck color here
      background-color: var(--ui-color-grey-400);
    }
  }
}

.icon {
  width: $line-height;
  height: $line-height;

  :deep(*) {
    width: 100%;
    height: 100%;
  }
}
</style>
