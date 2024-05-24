<template>
  <div
    class="ui-menu-item"
    :class="{ disabled, 'in-group': ctx?.inGroup, interactive: interactive }"
    @click="handleClick"
  >
    <div v-if="hasSlotIcon" class="icon">
      <slot name="icon"></slot>
    </div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, useSlots } from 'vue'
import { useDropdown } from '../UIDropdown.vue'
import { ctxKey } from './UIMenu.vue'

const props = withDefaults(
  defineProps<{
    interactive?: boolean
    disabled?: boolean
  }>(),
  {
    interactive: true,
    disabled: false
  }
)

const emit = defineEmits<{
  click: [e: MouseEvent]
}>()

const slots = useSlots()
const hasSlotIcon = !!slots['icon']
const ctx = inject(ctxKey)
const dropdownCtrl = useDropdown()

const disabled = computed(() => props.disabled || !!ctx?.disabled)

function handleClick(e: MouseEvent) {
  if (disabled.value) return
  // It is common to put a menu in a dropdown. For most of the cases, it is ideal to hide the
  // dropdown when menu-item clicked. We may make this behavior configurable if required.
  dropdownCtrl?.setVisible(false)
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
        content: '';
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
