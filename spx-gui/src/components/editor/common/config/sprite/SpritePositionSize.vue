<script setup lang="ts">
import { computed } from 'vue'

import { type Project } from '@/models/project'
import { type Sprite } from '@/models/sprite'
import { wrapUpdateHandler } from '../utils'

import { round } from '@/utils/utils'

import { UINumberInput } from '@/components/ui'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const spriteContext = () => ({
  sprite: props.sprite,
  project: props.project
})

// use `round` to avoid `0.07 * 100 = 7.000000000000001`
// TODO: use some 3rd-party tool like [Fraction.js](https://github.com/rawify/Fraction.js)
const sizePercent = computed(() => round(props.sprite.size * 100))

const handleXUpdate = wrapUpdateHandler((x: number | null) => props.sprite.setX(x ?? 0), spriteContext)
const handleYUpdate = wrapUpdateHandler((y: number | null) => props.sprite.setY(y ?? 0), spriteContext)
const handleSizePercentUpdate = wrapUpdateHandler((sizeInPercent: number | null) => {
  if (sizeInPercent == null) return
  props.sprite.setSize(round(sizeInPercent / 100, 2))
}, spriteContext)
</script>

<template>
  <div class="content">
    <UINumberInput
      v-radar="{ name: 'X position input', desc: 'Input to set sprite X position' }"
      :value="sprite.x"
      @update:value="handleXUpdate"
    >
      <template #prefix>X</template>
    </UINumberInput>
    <UINumberInput
      v-radar="{ name: 'Y position input', desc: 'Input to set sprite Y position' }"
      :value="sprite.y"
      @update:value="handleYUpdate"
    >
      <template #prefix>Y</template>
    </UINumberInput>
    <UINumberInput
      v-radar="{ name: 'Size input', desc: 'Input to set sprite size percentage' }"
      :min="0"
      :value="sizePercent"
      @update:value="handleSizePercentUpdate"
    >
      <template #prefix> {{ $t({ en: 'Size', zh: '大小' }) }}</template>
      <template #suffix>%</template>
    </UINumberInput>
  </div>
</template>

<style lang="scss" scoped>
.content {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
