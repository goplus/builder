<!--
  Phase "settings" for sprite-gen:
  * Inputting & enriching settings
  * Generate & select image (default costume)
-->

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIButton } from '@/components/ui'
import type { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { useMessageHandle } from '@/utils/exception'
import { humanizeTimeLeft } from '../common/time-left'
import LayoutWithPreview from '../common/LayoutWithPreview.vue'
import ImagePreview from '../common/ImagePreview.vue'
import ImageSelector from '../common/ImageSelector.vue'
import SpriteSettingsInput from './SpriteSettingsInput.vue'
import SpriteImageItem from './SpriteImageItem.vue'

const props = defineProps<{
  gen: SpriteGen
  descriptionPlaceholder?: string
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
</script>

<template>
  <main
    v-radar="{
      name: 'Sprite generation settings phase',
      desc: 'Generate default costume for the sprite based on settings'
    }"
    class="phase-settings"
  >
    <LayoutWithPreview :has-preview="hasPreview">
      <SpriteSettingsInput
        class="settings-input"
        :class="{ 'has-preview': hasPreview }"
        :gen="gen"
        :description-placeholder="descriptionPlaceholder"
      />
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

      <template #preview>
        <ImagePreview :file="gen.image" />
      </template>
    </LayoutWithPreview>
    <footer class="footer">
      <UIButton
        v-radar="{
          name: 'Next',
          desc: 'Click to proceed to the next phase of sprite generation (costume & animation generation)'
        }"
        color="primary"
        size="large"
        :disabled="!canSubmit"
        :loading="handleSubmit.isLoading.value"
        @click="handleSubmit.fn"
        >{{ $t({ en: 'Next', zh: '下一步' }) }}</UIButton
      >
    </footer>
  </main>
</template>

<style lang="scss" scoped>
.phase-settings {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100%;

  background-image: url('../common/phase-settings-left-bottom-bg.png'), url('../common/phase-settings-right-top-bg.png');
  background-position:
    left bottom,
    right -50px;
  background-repeat: no-repeat, no-repeat;
  background-size:
    520px auto,
    180px auto;

  .settings-input {
    &.has-preview {
      height: 300px;
    }
  }
}
.footer {
  width: 100%;
  flex: 0 0 auto;
  padding: 20px 24px;
  display: flex;
  justify-content: end;
  gap: 16px;
}
</style>
