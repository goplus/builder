<script lang="ts" setup>
import { UINumberInput } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import { type Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { wrapUpdateHandler } from '@/components/editor/common/config/utils'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

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
