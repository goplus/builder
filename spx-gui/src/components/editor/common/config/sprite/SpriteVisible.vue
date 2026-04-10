<script setup lang="ts">
import { type SpxProject } from '@/models/spx/project'
import { type Sprite } from '@/models/spx/sprite'
import { wrapUpdateHandler } from '../utils'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'

import { UIButtonGroup, UIButtonGroupItem, UIIcon } from '@/components/ui'

const props = defineProps<{
  sprite: Sprite
  project: SpxProject
}>()

const editorCtx = useEditorCtx()

const spriteContext = () => ({
  sprite: props.sprite,
  history: editorCtx.state.history
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
