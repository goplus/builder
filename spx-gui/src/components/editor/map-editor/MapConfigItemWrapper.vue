<script setup lang="ts">
import { UIIcon, UITooltip } from '@/components/ui'

defineProps<{ title?: string; question?: string }>()
</script>

<template>
  <div class="config-item-wrapper">
    <div v-if="title" class="label">
      {{ title
      }}<UITooltip v-if="question">
        <template #trigger>
          <UIIcon class="question" type="question" />
        </template>
        <pre>{{ question }}</pre></UITooltip
      >:
    </div>
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.config-item-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;

  .label {
    word-break: keep-all;

    &:has(.question) {
      display: flex;
      align-items: center;
      gap: 2px;
    }
  }

  .content {
    flex: 1;
  }
}
</style>
