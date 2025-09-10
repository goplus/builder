<template>
  <UIEmpty size="extra-large">
    {{
      $t({
        en: 'No recordings yet',
        zh: '没有录屏'
      })
    }}
  </UIEmpty>
</template>

<script setup lang="ts">
import { UIEmpty } from '@/components/ui'
</script>

<style lang="scss" scoped></style>
