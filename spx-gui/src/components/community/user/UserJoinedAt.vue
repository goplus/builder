<script setup lang="ts">
import { computed } from 'vue'
import UIIcon from '@/components/ui/icons/UIIcon.vue'
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
  <span class="user-joined-at" :title="$t(humanizeExactTime(props.time))">
    <UIIcon class="icon" type="calendar" />
    {{ $t(joinedAtText) }}
  </span>
</template>

<style lang="scss" scoped>
.user-joined-at {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--ui-color-hint-2);
}
.icon {
  width: 14px;
  height: 14px;
}
</style>
