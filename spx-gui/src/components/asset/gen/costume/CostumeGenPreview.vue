<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useFileUrl } from '@/utils/file'
import type { CostumeGen } from '@/models/gen/costume-gen'
import { UIImg, UIButton, UIError } from '@/components/ui'
import CostumeDetail from '@/components/editor/sprite/CostumeDetail.vue'
import { useRenameCostumeGen } from '../..'
import GenLoading from '../common/GenLoading.vue'
import GenPreview from '../common/GenPreview.vue'
import PreviewWithCheckerboardBg from '../common/PreviewWithCheckerboardBg.vue'

const props = defineProps<{
  gen: CostumeGen
}>()

const renameCostume = useRenameCostumeGen()
const handleRenameCostume = useMessageHandle(() => renameCostume(props.gen), {
  en: 'Failed to rename costume',
  zh: '重命名造型失败'
}).fn

const canSaveCostume = computed(() => {
  const { image, result } = props.gen
  if (image == null || result != null) return false
  if (imgLoading.value) return false
  return true
})

const savingCostume = computed(() => props.gen.finishState.status === 'running')

const handleSaveCostume = useMessageHandle(() => props.gen.finish(), {
  en: 'Failed to save costume',
  zh: '保存造型失败'
}).fn

const [imgSrc, imgLoading] = useFileUrl(() => props.gen.image)
</script>

<template>
  <GenPreview v-if="gen.result == null" class="costume-gen-preview" :name="gen.name" @rename="handleRenameCostume">
    <template v-if="canSaveCostume" #ops>
      <UIButton color="success" :loading="savingCostume" @click="handleSaveCostume">{{
        $t({ en: 'Save costume', zh: '保存造型' })
      }}</UIButton>
    </template>
    <GenLoading v-if="gen.generateState.status === 'running'">
      {{ $t({ en: 'Generating costume...', zh: '正在生成造型...' }) }}
    </GenLoading>
    <UIError v-else-if="gen.generateState.status === 'failed'">
      {{ $t(gen.generateState.error.userMessage) }}
    </UIError>
    <GenLoading v-else-if="imgLoading">
      {{ $t({ en: 'Loading image...', zh: '正在加载图片...' }) }}
    </GenLoading>
    <PreviewWithCheckerboardBg v-else>
      <UIImg v-if="gen.image != null" class="img" :src="imgSrc" :loading="imgLoading" />
    </PreviewWithCheckerboardBg>
  </GenPreview>
  <CostumeDetail v-else class="costume-detail" :costume="gen.result" @rename="handleRenameCostume" />
</template>

<style lang="scss" scoped>
.costume-gen-preview {
  position: absolute;
  inset: 0;
}

.img {
  width: 100%;
  height: 100%;
}

.costume-detail {
  background: transparent;
}
</style>
