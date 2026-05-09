<script setup lang="ts">
import { DefinitionKind } from '../../common'
import iconRead from './read.svg?raw'
import iconEffect from './effect.svg?raw'
import iconListen from './listen.svg?raw'
import iconCode from './code.svg?raw'

defineProps<{
  kind: DefinitionKind
}>()

function getIcon(kind: DefinitionKind) {
  if (kind === DefinitionKind.Listen) return iconListen
  if (kind === DefinitionKind.Command) return iconEffect
  if ([DefinitionKind.Constant, DefinitionKind.Variable, DefinitionKind.Read].includes(kind)) return iconRead
  return iconCode
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="h-4 w-4 [&_svg]:h-full [&_svg]:w-full" v-html="getIcon(kind)"></div>
</template>
