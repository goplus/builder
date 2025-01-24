<script setup lang="ts">
import type { ContextMenuController, TriggerData } from '.'

const props = defineProps<{
  controller: ContextMenuController
  data: TriggerData
}>()

function handleClick(e: MouseEvent) {
  if (!(e.currentTarget instanceof HTMLElement)) return
  const triggerPosition = e.currentTarget.getBoundingClientRect()
  const position = {
    left: triggerPosition.left,
    top: triggerPosition.top + triggerPosition.height
  }
  props.controller.showMenuForTriggerClick(position, props.data.selection)
}
</script>

<template>
  <button class="context-menu-trigger" type="button" @click="handleClick">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.5 7.07985C13.5225 8.54986 12.8026 9.68994 11.9026 10.7324C11.5471 11.1487 11.2298 11.5469 11.0453 12.0389C11.0123 12.1266 10.9327 12.1874 10.8397 12.1874H9.41254C9.28804 12.1874 9.1875 12.0869 9.1875 11.9624V9.98244L10.5225 8.64742C10.74 8.42992 10.74 8.06988 10.5225 7.85238C10.305 7.63488 9.94498 7.63488 9.72748 7.85238L8.625 8.95485L7.52252 7.85238C7.30502 7.63488 6.94498 7.63488 6.72748 7.85238C6.50998 8.06988 6.50998 8.42992 6.72748 8.64742L8.0625 9.98244V11.9624C8.0625 12.0869 7.96196 12.1874 7.83746 12.1874H6.40118C6.30818 12.1874 6.22947 12.1274 6.19647 12.0404C6.00522 11.5394 5.68057 11.1337 5.31757 10.7099C4.50007 9.74992 3.75 8.5424 3.75 7.1249C3.75 4.3874 6.00746 2.1749 8.76746 2.2499C11.34 2.3249 13.455 4.51485 13.5 7.07985ZM10.65 13.3124C10.5615 13.3124 6.68854 13.3124 6.60004 13.3124C6.37504 13.3124 6.375 13.4999 6.375 13.4999C6.375 14.2499 6.62991 14.8124 7.03491 15.1874C7.43991 15.5624 8.0025 15.7499 8.625 15.7499C9.2475 15.7499 9.81009 15.5624 10.2151 15.1874C10.6201 14.8124 10.875 14.2499 10.875 13.4999C10.875 13.4999 10.875 13.3124 10.65 13.3124Z"
        fill="currentColor"
      />
    </svg>
  </button>
</template>

<style lang="scss" scoped>
.context-menu-trigger {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  padding: 0;
  border: none;
  outline: none;
  background: var(--ui-color-grey-100);
  cursor: pointer;
  color: var(--ui-color-yellow-main);
  opacity: 0.8;
  transition: 0.2s;

  &:hover {
    opacity: 1;
    color: var(--ui-color-yellow-600);
  }
}
</style>
