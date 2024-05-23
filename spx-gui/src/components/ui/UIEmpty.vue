<template>
  <div class="ui-empty">
    <svg class="line" width="36" height="2" viewBox="0 0 36 2" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1H9" stroke="#EAEFF3" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 1H35" stroke="#EAEFF3" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <slot></slot>
    <template v-if="!slots.default">
      {{ config?.text ?? "There's nothing here" }}
    </template>
    <svg class="line" width="36" height="2" viewBox="0 0 36 2" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1H21" stroke="#EAEFF3" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 1H35" stroke="#EAEFF3" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { useSlots } from 'vue'
import { useConfig } from './UIConfigProvider.vue'

const config = useConfig().empty
const slots = useSlots()
</script>

<style scoped lang="scss">
// TODO: style not designed yet
.ui-empty {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-grey-600);

  container-type: inline-size;
}

.line {
  visibility: hidden;
}

// TODO: (text) content's width should also be considered
@container (width > 240px) {
  .line {
    visibility: visible;
  }
}
</style>
