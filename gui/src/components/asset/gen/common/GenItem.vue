<script lang="ts" setup>
import { UIBlockItem } from '@/components/ui'
import GenerationIndicator from './GenerationIndicator.vue'

withDefaults(
  defineProps<{
    active?: boolean
    /** If loading is true, it means a task is in progress; if loading is false, it means it is waiting for user action. */
    loading?: boolean
    /** highlight will highlight the placeholder. */
    highlight?: boolean
    placeholder: string
  }>(),
  {
    active: false,
    loading: false,
    highlight: false
  }
)
</script>

<template>
  <UIBlockItem class="gen-item" :class="{ loading, highlight, active }" :active="active" size="medium">
    <GenerationIndicator v-if="loading" />
    <div class="preview-wrapper">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="$slots.preview == null" class="placeholder" v-html="placeholder"></div>
      <slot v-else name="preview"></slot>
    </div>
    <slot></slot>
  </UIBlockItem>
</template>

<style scoped>
.gen-item.loading::before {
  border: none;
}

.gen-item.highlight .placeholder {
  color: var(--ui-color-primary-main);
}

.gen-item .preview-wrapper {
  margin-bottom: 5px;
  height: 60px;
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gen-item .placeholder {
  width: 24px;
  height: 24px;
  color: var(--ui-color-grey-700);
}
</style>
