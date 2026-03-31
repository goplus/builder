<script setup lang="ts">
import { computed } from 'vue'
import { humanizeExactTime, humanizeTime } from '@/utils/utils'

const props = defineProps<{
  time: string
}>()

const joinedAtText = computed(() => {
  const joinedAt = humanizeTime(props.time)
  return {
    en: `Joined ${joinedAt.en}`,
    zh: `加入于 ${joinedAt.zh}`
  }
})
</script>

<template>
  <span class="text-12 text-hint-2" :title="$t(humanizeExactTime(props.time))">
    {{ $t(joinedAtText) }}
  </span>
</template>
