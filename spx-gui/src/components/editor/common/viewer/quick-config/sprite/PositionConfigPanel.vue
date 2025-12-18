<script lang="ts" setup>
import { UINumberInput } from '@/components/ui'
import ConfigPanel, { useSyncFastSlowValue } from '../common/ConfigPanel.vue'
import { type Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { wrapUpdateHandler } from '@/components/editor/common/config/utils'

const props = defineProps<{
  sprite: Sprite
  project: Project
  x: number
  y: number
}>()

const pos = useSyncFastSlowValue(
  () => [props.x, props.y],
  () => [props.sprite.x, props.sprite.y]
)

const spriteContext = () => ({
  sprite: props.sprite,
  project: props.project
})

const handleXUpdate = wrapUpdateHandler((x: number | null) => props.sprite.setX(x ?? 0), spriteContext)
const handleYUpdate = wrapUpdateHandler((y: number | null) => props.sprite.setY(y ?? 0), spriteContext)
</script>

<template>
  <ConfigPanel>
    <div class="position-config-wrapper">
      <UINumberInput
        v-radar="{ name: 'X position input', desc: 'Input to set sprite X position' }"
        :value="pos[0]"
        @update:value="handleXUpdate"
      >
        <template #prefix>X</template>
      </UINumberInput>
      <UINumberInput
        v-radar="{ name: 'Y position input', desc: 'Input to set sprite Y position' }"
        :value="pos[1]"
        @update:value="handleYUpdate"
      >
        <template #prefix>Y</template>
      </UINumberInput>
    </div>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.position-config-wrapper {
  display: flex;
  gap: 4px;
  width: 158px;
}
</style>
