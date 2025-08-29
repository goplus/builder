<template>
  <EditorItemDetail :name="costume.name" @rename="handleRename">
    <div class="painter-wrapper">
      <CheckerboardBackground class="background" />
      <Painter class="painter" :img-src="imgSrc" :img-loading="imgLoading" @svg-change="handleSvgChange" />
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
import Painter from '@/components/editor/common/painter/paintBoard.vue'
import { useFileUrl } from '@/utils/file'
import { fromText } from '@/models/common/file'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  costume: Costume
  sprite: Sprite
}>()

const renameCostume = useRenameCostume()
const handleRename = useMessageHandle(() => renameCostume(props.costume), {
  en: 'Failed to rename costume',
  zh: '重命名造型失败'
}).fn

const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)

// 在 setup 阶段获取 editorCtx，避免在异步函数中调用
const editorCtx = useEditorCtx()

async function handleSvgChange(svg: string) {
  // console.log('handleSvgChange 被调用，SVG 长度:', svg?.length)
  // 用导出的 SVG 替换 costume.img
  // 继承原文件名的基础名，改后缀为 .svg
  const name = props.costume.name.replace(/[\\/:*?"<>|]/g, '-') + '.svg'
  const file = fromText(name, svg, { type: 'image/svg+xml' })
  // console.log('创建新文件:', name, '类型:', file.type)
  
  // 保存原始的分辨率设置
  const originalBitmapResolution = props.costume.bitmapResolution
  
  // 历史记录包装
  await editorCtx.project.history.doAction(
    { name: { en: 'Update costume image', zh: '更新造型图片' } },
    () => {
      // console.log('执行 setImg')
      props.costume.setImg(file)
      // 保持原始分辨率，不要强制改为1
      props.costume.setBitmapResolution(originalBitmapResolution)
      // console.log('setImg 完成')
    }
  )
  // console.log('handleSvgChange 完成')
}
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
