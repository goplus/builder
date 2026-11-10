<script lang="ts" setup>
import { UIBlockItem, UITag } from '@/components/ui'
import GenerationIndicator from './GenerationIndicator.vue'

withDefaults(
  defineProps<{
    active?: boolean
    /** If loading is true, it means a task is in progress; if loading is false, it means it is waiting for user action. */
    loading?: boolean
    /** highlight will highlight the placeholder. */
    highlight?: boolean
    suggested?: boolean
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
    <UITag
      v-if="suggested"
      variant="none"
      class="pointer-events-none absolute top-1.5 left-1.5 z-1 h-4 min-w-5 justify-center bg-grey-400 px-1 text-2xs font-medium text-grey-900"
      role="note"
      :aria-label="$t({ en: 'AI suggested', zh: 'AI 推荐' })"
      :tabindex="-1"
    >
      {{ $t({ en: 'Suggested', zh: '推荐' }) }}
    </UITag>
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
