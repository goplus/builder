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
  <div class="h-4 w-4 [&_svg]:h-full [&_svg]:w-full" v-html="typeIconMap[type]"></div>
</template>
