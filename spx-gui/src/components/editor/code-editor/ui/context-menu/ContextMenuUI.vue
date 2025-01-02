<script setup lang="ts">
import type { ContextMenuController } from '.'
import ContextMenu from './ContextMenu.vue'
import ContextMenuTrigger from './ContextMenuTrigger.vue'

defineProps<{
  controller: ContextMenuController
}>()
</script>

<template>
  <ContextMenu :data="controller.currentMenuData" :controller="controller" />
  <Teleport :to="controller.menuTriggerWidgetEl">
    <ContextMenuTrigger
      v-if="controller.currentTriggerData != null"
      :data="controller.currentTriggerData"
      :controller="controller"
    />
  </Teleport>
</template>
