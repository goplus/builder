<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { LocaleMessage } from '@/utils/i18n'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import { humanizeTimeLeft } from '../common/time-left'
import type { CostumeGen } from '@/models/spx/gen/costume-gen'
import { UIImg, UIButton, UIError } from '@/components/ui'
import CostumeDetail from '@/components/editor/sprite/CostumeDetail.vue'
import { useRenameCostumeGen } from '../..'
import GenLoading from '../common/GenLoading.vue'
import GenPreview from '../common/GenPreview.vue'
import PreviewWithCheckerboardBg from '../common/PreviewWithCheckerboardBg.vue'
import GenStateFailed from '../common/GenStateFailed.vue'

const props = defineProps<{
  gen: CostumeGen
  pendingMessage?: LocaleMessage
}>()

const renameCostume = useRenameCostumeGen()
const handleRenameCostume = useMessageHandle(() => renameCostume(props.gen), {
  en: 'Failed to rename costume',
  zh: '重命名造型失败'
}).fn

const canSaveCostume = computed(() => {
  const { image, result, generateState } = props.gen
  if (image == null || image === result?.img) return false
  if (generateState.status === 'running' || generateState.status === 'failed') return false
  if (imgLoading.value) return false
  return true
})

const savingCostume = computed(() => props.gen.finishState.status === 'running')

async function handleSaveCostume() {
  await props.gen.finish()
}

function handleSaveErrorBack() {
  props.gen.resetFinishState()
}

const [imgSrc, imgLoading] = useRenderableImageUrl(() => props.gen.image)
</script>

<template>
  <GenPreview
    v-if="
      gen.result == null ||
      gen.generateState.status === 'running' ||
      gen.generateState.status === 'failed' ||
      gen.image !== gen.result.img
    "
    class="absolute inset-0"
    :name="gen.name"
    @rename="handleRenameCostume"
  >
    <template v-if="$slots.leading != null" #leading>
      <slot name="leading"></slot>
    </template>
    <template #ops>
      <slot name="ops">
        <UIButton v-if="canSaveCostume" type="green" :loading="savingCostume" @click="handleSaveCostume">{{
          $t({ en: 'Save costume', zh: '保存造型' })
        }}</UIButton>
      </slot>
    </template>
    <GenLoading v-if="gen.generateState.status === 'running'">
      {{ $t(pendingMessage ?? { en: 'Generating costume...', zh: '正在生成造型...' }) }}
      {{ gen.generateState.timeLeft != null ? $t(humanizeTimeLeft(gen.generateState.timeLeft)) : '' }}
    </GenLoading>
    <GenStateFailed
      v-else-if="gen.generateState.status === 'failed'"
      :state-failed="gen.generateState"
      :back="gen.image != null ? () => gen.resetGenerateState() : undefined"
    />
    <GenLoading v-else-if="imgLoading">
      {{ $t({ en: 'Loading image...', zh: '正在加载图片...' }) }}
    </GenLoading>
    <PreviewWithCheckerboardBg v-else>
      <UIImg v-if="gen.image != null" class="h-full w-full" :src="imgSrc" :loading="imgLoading" />
      <slot v-if="gen.finishState.status !== 'running'" name="overlay"></slot>
      <GenLoading v-if="gen.finishState.status === 'running'" cover>
        {{ $t({ en: 'Saving costume...', zh: '正在保存造型...' }) }}
      </GenLoading>
      <UIError
        v-else-if="gen.finishState.status === 'failed'"
        cover
        :retry="handleSaveCostume"
        :back="handleSaveErrorBack"
      >
        {{ $t(gen.finishState.error.userMessage) }}
      </UIError>
    </PreviewWithCheckerboardBg>
  </GenPreview>
  <CostumeDetail v-else :style="{ background: 'transparent' }" :costume="gen.result" @rename="handleRenameCostume">
    <template #overlay>
      <slot name="overlay"></slot>
    </template>
    <template v-if="$slots.leading != null" #leading>
      <slot name="leading"></slot>
    </template>
    <template v-if="$slots.ops != null" #ops>
      <slot name="ops"></slot>
    </template>
  </CostumeDetail>
</template>
