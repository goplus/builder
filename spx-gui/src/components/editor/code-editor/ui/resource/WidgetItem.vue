<template>
  <UIEditorWidgetItem :name="item.name" :selected="selected">
    <template #icon>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="getIcon(item)"></div>
    </template>
  </UIEditorWidgetItem>
</template>

<script setup lang="ts">
import { UIEditorWidgetItem } from '@/components/ui'
import type { Widget } from '@/models/widget'
import { getIcon } from '@/components/editor/stage/widget/icon'

defineProps<{
  item: Widget
  selected: boolean
}>()
</script>
