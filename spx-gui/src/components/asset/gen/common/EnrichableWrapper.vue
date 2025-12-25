<script lang="ts" setup>
import { UITooltip } from '@/components/ui'

defineProps<{ enriched: boolean }>()
</script>

<template>
  <slot v-if="enriched"></slot>
  <UITooltip v-else>
    <template #trigger>
      <slot></slot>
    </template>
    {{
      $t({
        zh: '当前提示词信息较少。为了帮助你生成更理想的效果，系统正在自动丰富描述内容，请稍候...',
        en: 'The prompt information is too little. To help you generate a better effect, the system is automatically enriching the description content, please wait...'
      })
    }}
  </UITooltip>
</template>

<style lang="scss" scoped></style>
