<script lang="ts" setup>
import { UIIcon, type IconType } from '@/components/ui'
import { useSlots } from 'vue'

defineProps<{ icon?: IconType }>()

const slots = useSlots()
</script>

<template>
  <div class="config-item">
    <UIIcon v-if="slots.default == null && icon != null" class="icon" :type="icon" />
    <slot v-else></slot>
  </div>
</template>

<style lang="scss" scoped>
.config-item {
  width: 32px;
  height: 32px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;

  &:hover,
  &.active {
    background: var(--ui-color-turquoise-200);

    .icon {
      color: var(--ui-color-turquoise-500);
    }
  }
}
</style>
