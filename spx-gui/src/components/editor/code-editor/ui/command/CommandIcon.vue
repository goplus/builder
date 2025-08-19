<script setup lang="ts">
import { type CommandIconType } from '../../common'
import iconExplain from './explain.svg?raw'
import iconFix from './fix.svg?raw'
import iconGoto from './goto.svg?raw'
import iconModify from './modify.svg?raw'
import iconRename from './rename.svg?raw'
import iconCopy from './copy.svg?raw'
import iconCopilot from './copilot.svg?raw'

defineProps<{
  type: CommandIconType
}>()

const typeIconMap = {
  explain: iconExplain,
  fix: iconFix,
  goto: iconGoto,
  modify: iconModify,
  rename: iconRename,
  copy: iconCopy,
  copilot: iconCopilot
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="command-icon" v-html="typeIconMap[type]"></div>
</template>

<style lang="scss" scoped>
.command-icon {
  width: 16px;
  height: 16px;

  &:deep(svg) {
    width: 100%;
    height: 100%;
  }
}
</style>
