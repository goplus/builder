<template>
  <UIButton variant="stroke" color="white">
    <div class="action-content">
      <CommandIcon class="icon" :type="icon" />
      <slot></slot>
    </div>
  </UIButton>
</template>

<script setup lang="ts">
import { UIButton } from '@/components/ui'
import type { CommandIconType } from '../../common'
import CommandIcon from '../command/CommandIcon.vue'

defineProps<{
  icon: CommandIconType
}>()
</script>

<style lang="scss" scoped>
.action-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin: 0 -8px;
}
</style>
