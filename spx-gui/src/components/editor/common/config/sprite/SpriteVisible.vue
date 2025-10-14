<script setup lang="ts">
import { type Project } from '@/models/project'
import { type Sprite } from '@/models/sprite'
import { wrapUpdateHandler } from '../utils'

import { UIButtonGroup, UIButtonGroupItem, UIIcon } from '@/components/ui'

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
</template>

<style lang="scss" scoped></style>
