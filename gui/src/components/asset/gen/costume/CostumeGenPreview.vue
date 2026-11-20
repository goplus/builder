<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { LocaleMessage } from '@/utils/i18n'
import { useRenderableImage } from '@/utils/img-rendering'
import { humanizeTimeLeft } from '../common/time-left'
import type { CostumeGen } from '@/models/spx/gen/costume-gen'
import { UIImg, UIButton, UIError } from '@/components/ui'
import CostumeDetail from '@/components/editor/sprite/CostumeDetail.vue'
import { useRenameCostumeGen } from '../..'
import GenLoading from '../common/GenLoading.vue'
import GenPreview from '../common/GenPreview.vue'
import ResourceCanvas from '@/components/editor/sprite/ResourceCanvas.vue'
import ResourceGenerationPlaceholder from '@/components/editor/sprite/ResourceGenerationPlaceholder.vue'
import { useResourceCanvas } from '@/components/editor/sprite/resource-canvas'
import GenStateFailed from '../common/GenStateFailed.vue'

const props = withDefaults(
  defineProps<{
    gen: CostumeGen
    pendingMessage?: LocaleMessage
    resourceActions?: boolean
  }>(),
  { pendingMessage: undefined, resourceActions: true }
)

const canvas = useResourceCanvas()
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
const removingBackground = computed(() => savingCostume.value && !props.gen.transparentBackground)

async function handleSaveCostume() {
  await props.gen.finish()
}

function handleSaveErrorBack() {
  props.gen.resetFinishState()
}

const referenceImage = computed(() => {
  const gen = props.gen
  return gen.referenceImageSelection?.type === 'local-image'
    ? gen.referenceImageSelection.file
    : (gen.referenceCostume ?? gen.sprite.defaultCostume)?.img ?? null
})
const previewImage = computed(() =>
  props.gen.generateState.status === 'running' ? props.gen.image ?? referenceImage.value : props.gen.image
)
const [image, imgLoading] = useRenderableImage(previewImage)
const generating = computed(() => props.gen.generateState.status === 'running' || removingBackground.value)
const loading = ref(false)
watch(
  [() => props.gen, generating, imgLoading],
  ([gen, generating, imgLoading], [previousGen]) => {
    if (gen !== previousGen) loading.value = false
    // Only extend an active generation through decoding; history navigation must not start one.
    if (generating) loading.value = true
    else if (!imgLoading) loading.value = false
  },
  { immediate: true }
)
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
        <UIButton
          v-if="resourceActions !== false && canSaveCostume"
          type="green"
          :loading="savingCostume"
          @click="handleSaveCostume"
          >{{ $t({ en: 'Save costume', zh: '保存造型' }) }}</UIButton
        >
      </slot>
    </template>
    <ResourceGenerationPlaceholder
      v-if="gen.image == null && gen.generateState.status === 'initial'"
      media-type="image"
      :resource-key="gen.result?.id ?? gen.id"
    />
    <GenStateFailed
      v-else-if="gen.generateState.status === 'failed'"
      :state-failed="gen.generateState"
      :back="gen.image != null ? () => gen.resetGenerateState() : undefined"
    />
    <ResourceCanvas
      v-else-if="canvas == null || previewImage != null || gen.generateState.status === 'running'"
      :resource-key="gen.result?.id ?? gen.id"
      :image="previewImage"
    >
      <UIImg :key="image?.src" class="h-full w-full bg-white" :src="image?.src ?? null" />
      <template #overlay="{ area }">
        <slot v-if="!imgLoading && gen.finishState.status !== 'running'" name="overlay" :area="area"></slot>
      </template>
      <template #media-overlay>
        <div
          v-if="!loading && gen.image != null && gen.image !== gen.result?.img"
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 rounded-md border border-grey-400"
        ></div>
        <GenLoading :visible="loading" cover>
          <template v-if="removingBackground">{{ $t({ en: 'Saving costume...', zh: '正在保存造型...' }) }}</template>
          <template v-else>
            {{ $t(pendingMessage ?? { en: 'Generating costume...', zh: '正在生成造型...' }) }}
            {{
              gen.generateState.status === 'running' && gen.generateState.timeLeft != null
                ? $t(humanizeTimeLeft(gen.generateState.timeLeft))
                : ''
            }}
          </template>
        </GenLoading>
        <UIError
          v-if="gen.finishState.status === 'failed'"
          cover
          :retry="handleSaveCostume"
          :back="handleSaveErrorBack"
        >
          {{ $t(gen.finishState.error.userMessage) }}
        </UIError>
      </template>
    </ResourceCanvas>
  </GenPreview>
  <CostumeDetail v-else :style="{ background: 'transparent' }" :costume="gen.result" @rename="handleRenameCostume">
    <template #overlay="{ area }">
      <slot name="overlay" :area="area"></slot>
    </template>
    <template v-if="$slots.leading != null" #leading>
      <slot name="leading"></slot>
    </template>
    <template v-if="$slots.ops != null" #ops>
      <slot name="ops"></slot>
    </template>
  </CostumeDetail>
</template>
