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
        zh: '当前描述信息较少，点击下面的按钮，我们将自动帮您丰富细节',
        en: 'The description is too little. Please click the button below to enrich the details automatically'
      })
    }}
  </UITooltip>
</template>

<style lang="scss" scoped></style>
