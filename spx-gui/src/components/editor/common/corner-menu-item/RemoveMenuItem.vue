<script setup lang="ts">
import { UIMenuItem } from '@/components/ui'

import type { RadarNodeMeta } from '@/utils/radar'

withDefaults(
  defineProps<{
    radar?: RadarNodeMeta
  }>(),
  {
    radar: () => ({ name: 'Remove', desc: 'Click to remove the item' })
  }
)
</script>

<template>
  <UIMenuItem radar="radar">
    {{ $t({ en: 'Remove', zh: '删除' }) }}
  </UIMenuItem>
</template>
