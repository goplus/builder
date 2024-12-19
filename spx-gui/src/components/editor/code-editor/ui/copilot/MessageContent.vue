<script setup lang="ts">
import type { LocaleMessage } from '@/utils/i18n'
import type { MarkdownStringFlag } from '../../common'
import MarkdownView from '../markdown/MarkdownView.vue'

const props = defineProps<{
  flag?: MarkdownStringFlag
  /** Markdown string with MDX support. */
  value: string | LocaleMessage
}>()
</script>

<template>
  <MarkdownView v-bind="props" class="message-content" />
</template>

<style lang="scss" scoped>
.message-content {}
</style>
