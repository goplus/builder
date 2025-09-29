<script setup lang="ts">
import { type Project } from '@/models/project'
import { type Sprite } from '@/models/sprite'
import { wrapUpdateHandler } from '../utils'

import { UIButtonGroup, UIButtonGroupItem, UIIcon } from '@/components/ui'
import MapConfigItem from '../MapConfigItem.vue'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const spriteContext = () => ({
  sprite: props.sprite,
  project: props.project
})

const handleVisibleUpdate = wrapUpdateHandler(
  (visible: boolean) => props.sprite.setVisible(visible),
  spriteContext,
  false
)
</script>

<template>
  <MapConfigItem :title="$t({ en: 'Show', zh: '显示' })">
    <UIButtonGroup
      v-radar="{ name: 'Visibility control', desc: 'Control to toggle sprite visibility' }"
      :value="sprite.visible ? 'visible' : 'hidden'"
      @update:value="(v) => handleVisibleUpdate(v === 'visible')"
    >
      <UIButtonGroupItem value="visible">
        <UIIcon type="eye" />
      </UIButtonGroupItem>
      <UIButtonGroupItem value="hidden">
        <UIIcon type="eyeSlash" />
      </UIButtonGroupItem>
    </UIButtonGroup>
  </MapConfigItem>
</template>

<style lang="scss">
.with-label {
  display: flex;
  gap: 4px;
  align-items: center;
  word-break: keep-all;
}
</style>
