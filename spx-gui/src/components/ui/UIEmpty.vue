<template>
  <div class="ui-empty">
    <slot></slot>
    <template v-if="!slots.default">
      {{ config?.text ?? "There's nothing here" }}
    </template>
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
  height: 80%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-grey-600);
}
</style>
