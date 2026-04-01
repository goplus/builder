<script setup lang="ts">
import { debounce } from 'lodash'

import type { SpxProject } from '@/models/spx/project'

import { UINumberInput } from '@/components/ui'
import { defaultMapSize } from '@/models/spx/stage'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  project: SpxProject
}>()

const editorCtx = useEditorCtx()

const handleWidthChange = debounce((v: number | null) => {
  const action = { name: { en: `Configure map width`, zh: `修改地图宽度` } }
  editorCtx.state.history.doAction(action, () => props.project.stage.setMapWidth(v != null ? v : defaultMapSize.width))
}, 300)
const handleHeightChange = debounce((v: number | null) => {
  const action = { name: { en: `Configure map height`, zh: `修改地图高度` } }
  editorCtx.state.history.doAction(action, () =>
    props.project.stage.setMapHeight(v != null ? v : defaultMapSize.height)
  )
}, 300)
</script>

<template>
  <div class="flex gap-2">
    <UINumberInput
      v-radar="{ name: 'width input', desc: 'Input to set map width' }"
      :value="project.stage.mapWidth"
      @update:value="handleWidthChange"
    >
      <template #prefix>{{ $t({ en: 'Width', zh: '宽' }) }}</template>
    </UINumberInput>
    <UINumberInput
      v-radar="{ name: 'height input', desc: 'Input to set map height' }"
      :value="project.stage.mapHeight"
      @update:value="handleHeightChange"
    >
      <template #prefix>{{ $t({ en: 'Height', zh: '高' }) }}</template>
    </UINumberInput>
  </div>
</template>
