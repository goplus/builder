<template>
  <div class="flex items-center gap-xl text-grey-800">
    <div>
      {{ $t({ en: 'Backdrop Mode', zh: '背景模式' }) }}
    </div>
    <UIButtonGroup
      v-radar="{ name: 'Backdrop mode selector', desc: 'Selector to choose backdrop mode for the stage' }"
      type="text"
      :value="editorCtx.project.stage.mapMode"
      @update:value="(v) => handleUpdateMapMode(v as MapMode)"
    >
      <UITooltip>
        {{
          $t({
            en: 'The image will be tiled (repeated) to fill the stage',
            zh: '图片会平铺（重复）以填满舞台'
          })
        }}
        <template #trigger>
          <UIButtonGroupItem value="repeat">
            {{ $t({ en: 'Tile', zh: '平铺' }) }}
          </UIButtonGroupItem>
        </template>
      </UITooltip>
      <UITooltip>
        {{
          $t({
            en: 'The image will be proportionally scaled to cover the stage; some parts may be cropped',
            zh: '图片会被按比例缩放，以覆盖舞台；图片的某些部分可能会被裁剪'
          })
        }}
        <template #trigger>
          <UIButtonGroupItem value="fillRatio">
            {{ $t({ en: 'Scale', zh: '缩放' }) }}
          </UIButtonGroupItem>
        </template>
      </UITooltip>
      <UITooltip>
        {{
          $t({
            en: 'The image will be aligned to the stage center without scaling or tiling',
            zh: '图片会以原始尺寸显示，并与舞台中心对齐，不缩放也不平铺'
          })
        }}
        <template #trigger>
          <UIButtonGroupItem value="actualSize">
            {{ $t({ en: 'Original', zh: '原图' }) }}
          </UIButtonGroupItem>
        </template>
      </UITooltip>
    </UIButtonGroup>
  </div>
</template>
<script setup lang="ts">
import { UITooltip, UIButtonGroup, UIButtonGroupItem } from '@/components/ui'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import type { MapMode } from '@/models/spx/stage'

const handleUpdateMapMode = (mode: MapMode) => {
  editorCtx.state.history.doAction({ name: { en: 'Update backdrop mode', zh: '修改背景模式' } }, () => {
    editorCtx.project.stage.setMapMode(mode)
  })
}

const editorCtx = useEditorCtx()
</script>
