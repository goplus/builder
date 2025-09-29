<script setup lang="ts">
import { UIIcon, UITooltip } from '@/components/ui'

defineProps<{ title?: string; question?: string }>()
</script>

<template>
  <tr class="map-config-item">
    <td v-if="title != null" class="label-cell" colspan="1">
      <div class="label">
        {{ title
        }}<UITooltip v-if="question != null">
          <template #trigger>
            <UIIcon class="question" type="question" />
          </template>
          <pre>{{ question }}</pre>
        </UITooltip>
      </div>
    </td>
    <td :colspan="title != null ? 1 : 2">
      <slot></slot>
    </td>
  </tr>
</template>

<style lang="scss" scoped>
.map-config-item {
  vertical-align: middle;

  .label-cell {
    width: 0;
    vertical-align: inherit;
  }

  .label {
    white-space: nowrap;
    margin-right: 16px;

    &:has(.question) {
      display: flex;
      align-items: center;
      gap: 2px;
    }
  }
}
</style>
