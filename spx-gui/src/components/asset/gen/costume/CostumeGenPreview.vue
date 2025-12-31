<script lang="ts" setup>
import { useMessageHandle } from '@/utils/exception'
import { useFileUrl } from '@/utils/file'
import type { CostumeGen } from '@/models/gen/costume-gen'
import { UIImg, UIButton } from '@/components/ui'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'
import { useRenameCostumeGen } from '../..'
import GenLoading from '../common/GenLoading.vue'
import GenPreview from '../common/GenPreview.vue'

const props = defineProps<{
  gen: CostumeGen
}>()

const renameCostume = useRenameCostumeGen()
const handleRenameCostume = useMessageHandle(renameCostume, {
  en: 'Failed to rename costume',
  zh: '重命名造型失败'
}).fn

const handleSaveCostume = useMessageHandle(() => props.gen.finish(), {
  en: 'Failed to save costume',
  zh: '保存造型失败'
})

const [imgSrc, imgLoading] = useFileUrl(() => props.gen.image)
</script>

<template>
  <GenPreview class="costume-gen-preview" :name="gen.name" @rename="handleRenameCostume(gen)">
    <template v-if="gen.image != null && gen.result == null" #ops>
      <UIButton color="success" :loading="handleSaveCostume.isLoading.value" @click="handleSaveCostume.fn">{{
        $t({ en: 'Save costume', zh: '保存造型' })
      }}</UIButton>
    </template>
    <GenLoading v-if="gen.generateState.status === 'running'">
      {{ $t({ en: 'Generating costume...', zh: '正在生成造型...' }) }}
    </GenLoading>
    <div v-else class="img-wrapper">
      <CheckerboardBackground class="background" />
      <UIImg v-if="gen.image != null" class="img" :src="imgSrc" :loading="imgLoading" />
      <div v-else class="placeholder">{{ $t({ en: 'Preview area', zh: '预览区域' }) }}</div>
    </div>
  </GenPreview>
</template>

<style lang="scss" scoped>
.costume-gen-preview {
  position: absolute;
  inset: 0;
}

.img-wrapper {
  width: 100%;
  flex: 1 1 0;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}

.img {
  width: 100%;
  height: 100%;
}

.placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-hint-2);
}
</style>
