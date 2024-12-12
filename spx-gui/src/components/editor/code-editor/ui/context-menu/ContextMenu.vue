<script setup lang="ts">
import { computed } from 'vue'
import { UIMenu, UIMenuGroup, UIMenuItem, UIDropdown } from '@/components/ui'
import type { ContextMenuController, MenuData, MenuItem } from '.'

const props = defineProps<{
  controller: ContextMenuController
  data: MenuData
}>()

const pos = computed(() => {
  return {
    x: props.data.position.left,
    y: props.data.position.top
  }
})

function handleItemClick(item: MenuItem) {
  props.controller.executeMenuItem(item)
}
</script>

<template>
  <UIDropdown class="context-menu" trigger="manual" visible :pos="pos" placement="bottom-start">
    <UIMenu>
      <UIMenuGroup v-for="(group, i) in data.groups" :key="i">
        <UIMenuItem v-for="(item, j) in group" :key="j" @click="handleItemClick(item)">
          {{ item.title }}
        </UIMenuItem>
      </UIMenuGroup>
    </UIMenu>
  </UIDropdown>
</template>

<style lang="scss" scoped></style>
