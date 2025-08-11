<template>
  <EditorItemDetail :name="costume.name" @rename="handleRename">
    <div class="painter-wrapper">
      <CheckerboardBackground class="background" />
      <Painter class="painter" />
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { useMessageHandle } from '@/utils/exception'
import type { Costume } from '@/models/costume'
import type { Sprite } from '@/models/sprite'
import { useRenameCostume } from '@/components/asset'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import CheckerboardBackground from './CheckerboardBackground.vue'
import Painter from '@/components/editor/common/painter/painter.vue'

const props = defineProps<{
  costume: Costume
  sprite: Sprite
}>()

const renameCostume = useRenameCostume()
const handleRename = useMessageHandle(() => renameCostume(props.costume), {
  en: 'Failed to rename costume',
  zh: '重命名造型失败'
}).fn
</script>

<style lang="scss" scoped>
.painter-wrapper {
  width: 100%;
  flex: 1 1 0;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  min-height: 400px; // 确保画板有足够的高度
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}

.painter {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1; // 确保画板在背景之上
}

// 覆盖画板组件的样式以适应容器
:deep(.painter-container) {
  padding: 0;
  background-color: transparent;
  width: 100%;
  height: 100%;
}

:deep(canvas) {
  border: none;
  border-radius: 0;
  box-shadow: none;
  width: 100% !important;
  height: 100% !important;
}
</style>
