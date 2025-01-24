<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { UIMenu, UIMenuGroup, UIMenuItem, UIDropdown } from '@/components/ui'
import type { ContextMenuController, InternalMenuItem, MenuData } from '.'

const props = defineProps<{
  controller: ContextMenuController
  data: MenuData | null
}>()

const pos = computed(() => {
  if (props.data == null) return { x: 0, y: 0 }
  return {
    x: props.data.position.left,
    y: props.data.position.top
  }
})

const handleItemClick = useMessageHandle((item: InternalMenuItem) => props.controller.executeMenuItem(item), {
  en: 'Failed to execute command',
  zh: '执行命令失败'
}).fn
</script>

<template>
  <UIDropdown class="context-menu" trigger="manual" :visible="data != null" :pos="pos" placement="bottom-start">
    <UIMenu>
      <UIMenuGroup v-for="(group, i) in data?.groups" :key="i">
        <UIMenuItem v-for="(item, j) in group" :key="j" @click="handleItemClick(item)">
          {{ item.title }}
        </UIMenuItem>
      </UIMenuGroup>
    </UIMenu>
  </UIDropdown>
</template>

<style lang="scss" scoped></style>
