<!--
  Phase "settings" for sprite-gen:
  * Inputting & enriching settings
  * Generate & select image (default costume)
-->

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIButton } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import type { Sprite } from '@/models/spx/sprite'
import { asset2Sprite } from '@/models/spx/common/asset'
import type { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { useMessageHandle } from '@/utils/exception'
import { humanizeTimeLeft } from '../common/time-left'
import LayoutWithPreview from '../common/LayoutWithPreview.vue'
import ImagePreview from '../common/ImagePreview.vue'
import ImageSelector from '../common/ImageSelector.vue'
import AssetSuggestions from '../common/AssetSuggestions.vue'
import { useAssetSuggestions } from '../common/use-asset-suggestions'
import SpriteSettingsInput from './SpriteSettingsInput.vue'
import SpriteImageItem from './SpriteImageItem.vue'
import SpriteItem from '@/components/asset/library/SpriteItem.vue'

const props = withDefaults(
  defineProps<{
    gen: SpriteGen
    descriptionPlaceholder?: string
    librarySearchEnabled?: boolean
  }>(),
  {
    descriptionPlaceholder: undefined,
    librarySearchEnabled: false
  }
)

const emit = defineEmits<{
  resolved: [Sprite]
}>()

const canSubmit = computed(() => props.gen.image != null)

const handleSubmit = useMessageHandle(() => props.gen.prepareContent(), {
  en: 'Failed to generate sprite content',
  zh: '生成精灵内容失败'
})

// The preview area remains visible once the user has selected any generated image.
// Example: if a user selects an image and then triggers regeneration,
// the preview area stays visible even when no image is selected during or after generation.
const hasPreview = ref(props.gen.imageIndex != null)
function handleImageSelect(index: number) {
  props.gen.setImageIndex(index)
  hasPreview.value = true
}

const isLibrarySearchEnabled = computed(
  () => props.librarySearchEnabled && props.gen.imagesGenState.status === 'initial'
)

const {
  keyword,
  suggestions,
  isLoading: isSuggestionsLoading,
  selected: selectedAsset,
  toggle: toggleSelectedAsset
} = useAssetSuggestions(AssetType.Sprite, () => props.gen.settings.description, isLibrarySearchEnabled)

const handleUseAsset = useMessageHandle(
  async () => {
    if (selectedAsset.value == null) throw new Error('no asset selected')
    const sprite = await asset2Sprite(selectedAsset.value)
    emit('resolved', sprite)
  },
  {
    en: 'Failed to use asset',
    zh: '使用素材失败'
  }
)
</script>

<template>
  <main
    v-radar="{
      name: 'Sprite generation settings phase',
      desc: 'Generate default costume for the sprite based on settings'
    }"
    class="phase-settings flex h-full flex-col items-stretch"
  >
    <LayoutWithPreview :has-preview="hasPreview">
      <SpriteSettingsInput
        :class="{ 'h-75': hasPreview }"
        :gen="gen"
        :description-placeholder="descriptionPlaceholder"
      />
      <!-- Fixed height to prevent layout shift when suggestions appear/disappear -->
      <div class="min-h-42.5">
        <AssetSuggestions
          v-if="isLibrarySearchEnabled"
          :type="AssetType.Sprite"
          :loading="isSuggestionsLoading"
          :keyword="keyword"
          :suggestions="suggestions"
          :selected="selectedAsset"
          @toggle="toggleSelectedAsset"
        >
          <template #item="{ asset, selected, onClick }">
            <SpriteItem :asset="asset" :selected="selected" @click="onClick" />
          </template>
        </AssetSuggestions>
        <ImageSelector
          :state="gen.imagesGenState"
          :selected="gen.imageIndex"
          :disabled="handleSubmit.isLoading.value"
          @select="handleImageSelect"
        >
          <template #loading-item>
            <SpriteImageItem loading />
          </template>
          <template #item="{ file, active, onClick }">
            <SpriteImageItem :file="file" :active="active" @click="onClick" />
          </template>
          <template #tip>
            <template v-if="gen.imagesGenState.status === 'running'">
              {{ $t({ en: `Generating sprites... `, zh: `正在生成精灵...` }) }}
              {{ gen.imagesGenState.timeLeft != null ? $t(humanizeTimeLeft(gen.imagesGenState.timeLeft)) : '' }}
            </template>
            <template v-else-if="gen.imagesGenState.status === 'finished'">
              {{
                $t({
                  en: 'Select the sprite you like the most, or generate new ones.',
                  zh: '选择你最喜欢的一个精灵，或者重新生成。'
                })
              }}
            </template>
          </template>
        </ImageSelector>
      </div>

      <template #preview>
        <ImagePreview :file="gen.image" />
      </template>
    </LayoutWithPreview>
    <footer class="w-full flex-none px-6 py-5 flex justify-end gap-4">
      <UIButton
        v-if="selectedAsset != null"
        v-radar="{
          name: 'Use',
          desc: 'Click to use the selected library asset'
        }"
        color="primary"
        size="large"
        @click="handleUseAsset.fn"
      >
        {{ $t({ en: 'Use', zh: '采用' }) }}
      </UIButton>
      <UIButton
        v-else
        v-radar="{
          name: 'Next',
          desc: 'Click to proceed to the next phase of sprite generation (costume & animation generation)'
        }"
        color="primary"
        size="large"
        :disabled="!canSubmit"
        :loading="handleSubmit.isLoading.value"
        @click="handleSubmit.fn"
      >
        {{ $t({ en: 'Next', zh: '下一步' }) }}
      </UIButton>
    </footer>
  </main>
</template>

<style scoped>
.phase-settings {
  background-image: url('../common/phase-settings-left-bottom-bg.png'), url('../common/phase-settings-right-top-bg.png');
  background-position:
    left bottom,
    right -50px;
  background-repeat: no-repeat, no-repeat;
  background-size:
    520px auto,
    180px auto;
}
</style>
