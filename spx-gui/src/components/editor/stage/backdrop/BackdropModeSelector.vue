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
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6 1C3.2385 1 1 3.2385 1 6C1 8.7615 3.2385 11 6 11C8.7615 11 11 8.7615 11 6C11 3.2385 8.7615 1 6 1ZM6.01001 8.75C5.73401 8.75 5.50745 8.526 5.50745 8.25C5.50745 7.974 5.729 7.75 6.005 7.75H6.01001C6.28651 7.75 6.51001 7.974 6.51001 8.25C6.51001 8.526 6.28601 8.75 6.01001 8.75ZM6.80151 6.26404C6.43601 6.50904 6.36797 6.64552 6.35547 6.68152C6.30297 6.83802 6.157 6.93701 6 6.93701C5.9605 6.93701 5.92048 6.93098 5.88098 6.91748C5.68448 6.85148 5.57903 6.639 5.64453 6.4425C5.73503 6.1725 5.96954 5.918 6.38354 5.6405C6.89404 5.2985 6.82851 4.92354 6.80701 4.80054C6.75051 4.47354 6.47499 4.19494 6.15149 4.13794C5.90549 4.09294 5.66505 4.15744 5.47705 4.31494C5.28805 4.47344 5.17944 4.70696 5.17944 4.95496C5.17944 5.16196 5.01144 5.32996 4.80444 5.32996C4.59744 5.32996 4.42944 5.16196 4.42944 4.95496C4.42944 4.48446 4.6355 4.04198 4.995 3.74048C5.351 3.44248 5.81948 3.31802 6.28198 3.40002C6.91548 3.51202 7.43503 4.03549 7.54553 4.67249C7.65553 5.30349 7.39101 5.86904 6.80151 6.26404Z"
              fill="currentColor"
            />
          </svg>
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
import { UITooltip, UIButtonGroup, UIButtonGroupItem } from '@/components/ui'
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
