<script setup lang="ts">
import type { File } from '@/models/common/file'
import { UIError } from '@/components/ui'
import SpriteImageItem from './SpriteImageItem.vue'
import SpriteLoadingImageItem from './SpriteLoadingImageItem.vue'
import type { PhaseState } from '@/models/gen/common'

defineProps<{
  state: PhaseState<File[]>
  selected: File | null
}>()

const emit = defineEmits<{
  select: [File]
}>()
</script>

<template>
  <div v-if="state.status !== 'initial'" class="sprite-image-selector">
    <ul class="list">
      <template v-if="state.status === 'running'">
        <SpriteLoadingImageItem v-for="idx in 4" :key="idx" />
      </template>
      <UIError v-else-if="state.status === 'failed'">{{ $t(state.error.userMessage) }}</UIError>
      <template v-else>
        <SpriteImageItem
          v-for="(option, idx) in state.result ?? []"
          :key="idx"
          :file="option"
          :active="selected === option"
          @click="emit('select', option)"
        />
      </template>
    </ul>
    <p class="tip">
      {{
        $t({
          en: 'Select the sprite you like the most, or generate new ones.',
          zh: '选择你最喜欢的一个精灵，或者重新生成。'
        })
      }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.sprite-image-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.list {
  display: flex;
  align-items: center;
  align-content: center;
  gap: 8px;
  flex-wrap: wrap;
  list-style: none;
}

.tip {
  text-align: center;
  font-size: 12px;
  color: var(--ui-color-hint-2);
}
</style>
