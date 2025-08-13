<script setup lang="ts">
import { UIMenuItem } from '@/components/ui'

import type { RadarNodeMeta } from '@/utils/radar'

withDefaults(
  defineProps<{
    radar?: RadarNodeMeta
  }>(),
  {
    radar: () => ({ name: 'Rename button', desc: 'Click to rename the selected item' })
  }
)
</script>

<template>
  <UIMenuItem radar="radar">
    {{ $t({ en: 'Rename', zh: '重命名' }) }}
  </UIMenuItem>
</template>
