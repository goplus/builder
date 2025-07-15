<template>
  <UIFlatButton>
    <CommandIcon class="icon" :type="icon" />
    <slot></slot>
  </UIFlatButton>
</template>

<script setup lang="ts">
import { UIFlatButton } from '@/components/ui'
import type { CommandIconType } from '../../common'
import CommandIcon from '../command/CommandIcon.vue'

defineProps<{
  icon: CommandIconType
}>()
</script>
