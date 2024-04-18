<!-- Input to control visible (of sprite), may be moved to UI components later (replacing UISwitch?) -->

<template>
  <div class="visible-input">
    <div class="positive" :class="{ active: value }" @click="emit('update:value', true)">
      <UIIcon class="icon" type="eye" />
    </div>
    <div class="negative" :class="{ active: !value }" @click="emit('update:value', false)">
      <UIIcon class="icon" type="eyeSlash" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { UIIcon } from '@/components/ui'

defineProps<{
  value: boolean
}>()

const emit = defineEmits<{
  'update:value': [boolean]
}>()
</script>

<style scoped lang="scss">
.visible-input {
  display: flex;
}

.positive,
.negative {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-color-grey-300);
  cursor: pointer;

  &.active {
    color: var(--ui-color-primary-400);
    background: var(--ui-color-primary-200);
    cursor: default;
  }
}

.positive {
  border-radius: 12px 0px 0px 12px;
}

.negative {
  border-radius: 0px 12px 12px 0px;
}

.icon {
  width: 16px;
  height: 16px;
}
</style>
