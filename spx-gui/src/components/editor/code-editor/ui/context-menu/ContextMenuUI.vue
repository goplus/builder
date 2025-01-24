<script setup lang="ts">
import type { ContextMenuController } from '.'
import ContextMenu from './ContextMenu.vue'
import ContextMenuTrigger from './ContextMenuTrigger.vue'

defineProps<{
  controller: ContextMenuController
}>()
</script>

<template>
  <ContextMenu :data="controller.menuData" :controller="controller" />
  <Teleport :to="controller.triggerWidgetEl">
    <ContextMenuTrigger v-if="controller.triggerData != null" :data="controller.triggerData" :controller="controller" />
  </Teleport>
</template>
