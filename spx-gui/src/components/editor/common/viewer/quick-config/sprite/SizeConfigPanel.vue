<script lang="ts" setup>
import { UINumberInput } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import type { Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { computed } from 'vue'
import { round } from '@/utils/utils'
import { wrapUpdateHandler } from '@/components/editor/common/config/utils'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const spriteContext = () => ({
  sprite: props.sprite,
  project: props.project
})

const sizePercent = computed(() => round(props.sprite.size * 100))
const handleSizePercentUpdate = wrapUpdateHandler((sizeInPercent: number | null) => {
  if (sizeInPercent == null) return
  props.sprite.setSize(round(sizeInPercent / 100, 2))
}, spriteContext)
</script>

<template>
  <ConfigPanel>
    <UINumberInput
      v-radar="{ name: 'Size input', desc: 'Input to set sprite size percentage' }"
      class="size-input"
      :min="0"
      :value="sizePercent"
      @update:value="handleSizePercentUpdate"
    >
      <template #prefix>{{ $t({ en: 'Size', zh: '大小' }) }}</template>
      <template #suffix>%</template>
    </UINumberInput>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.size-input {
  width: 102px;
}
</style>
