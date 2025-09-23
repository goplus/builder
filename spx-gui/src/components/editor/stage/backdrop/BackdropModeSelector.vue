<template>
  <div class="container">
    <div class="gap-4">
      <div>
        {{ $t({ en: 'Backdrop Mode', zh: '背景模式' }) }}
      </div>
      <UITooltip>
        <template #default>
          <pre>{{
            $t({
              en: `•Tile Mode: The image will be tiled (repeated) to fill the stage
•Scale Mode: The image will be proportionally scaled to ensure it covers the stage; some parts of the image may be cropped
`,
              zh: `•平铺模式：图片会平铺（重复）以填满舞台
•缩放模式：图片会被按比例缩放，以确保刚好覆盖舞台；图片的某些部分可能会被裁剪
`
            })
          }}</pre>
        </template>
        <template #trigger>
          <UIIcon type="question" />
        </template>
      </UITooltip>
    </div>
    <UIButtonGroup
      v-radar="{ name: 'Backdrop mode selector', desc: 'Selector to choose backdrop mode for the stage' }"
      type="text"
      :value="editorCtx.project.stage.mapMode"
      @update:value="(v) => handleUpdateMapMode(v as MapMode)"
    >
      <UIButtonGroupItem value="repeat">
        {{ $t({ en: 'Tile', zh: '平铺' }) }}
      </UIButtonGroupItem>
      <UIButtonGroupItem value="fillRatio">
        {{ $t({ en: 'Scale', zh: '缩放' }) }}
      </UIButtonGroupItem>
    </UIButtonGroup>
  </div>
</template>
<script setup lang="ts">
import { UITooltip, UIButtonGroup, UIButtonGroupItem, UIIcon } from '@/components/ui'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import type { MapMode } from '@/models/stage'

const handleUpdateMapMode = (mode: MapMode) => {
  editorCtx.project.history.doAction({ name: { en: 'Update backdrop mode', zh: '修改背景模式' } }, () => {
    editorCtx.project.stage.setMapMode(mode)
  })
}

const editorCtx = useEditorCtx()
</script>
<style scoped lang="scss">
.container {
  display: flex;
  align-items: center;
  color: var(--ui-color-grey-800);
  gap: 16px;
}

.gap-4 {
  display: flex;
  gap: 4px;
  align-items: center;
}
</style>
