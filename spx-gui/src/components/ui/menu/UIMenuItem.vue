<template>
  <div
    class="ui-menu-item"
    :class="{ disabled: ctx?.disabled, 'in-group': ctx?.inGroup, interactive: interactive }"
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
import { ctxKey } from './UIMenu.vue'

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
const ctx = inject(ctxKey)

function handleClick(e: MouseEvent) {
  if (ctx?.value.disabled) return
  emit('click', e)
}
</script>

<style lang="scss" scoped>
.ui-menu-item {
  padding: 8px 20px 8px 12px;
  line-height: 16px;
  display: flex;
  align-items: center;
  gap: 6px;

  &.disabled {
    cursor: not-allowed;
    color: var(--ui-color-grey-600);
    .icon {
      opacity: 0.5;
    }
  }

  &.interactive:not(.disabled) {
    cursor: pointer;

    &:hover {
      background-color: var(--ui-color-grey-400);
    }
  }

  &:not(.in-group) {
    margin: 8px 0;

    & + .ui-menu-item {
      margin-top: 16px;
      position: relative;
      &:before {
        content: "";
        position: absolute;
        top: -8px;
        left: 0;
        width: 100%;
        height: 0;
        border-top: 1px solid var(--ui-color-dividing-line-2);
      }
    }
  }
}

.icon {
  width: 24px;
  height: 24px;

  :deep(*) {
    width: 100%;
    height: 100%;
  }
}
</style>
