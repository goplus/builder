<template>
  <UIButton variant="stroke" color="white">
    <div class="-mx-2 flex items-center justify-center gap-1">
      <CommandIcon :type="icon" />
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
