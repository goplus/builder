<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIButton } from '@/components/ui'
import type { Backdrop } from '@/models/spx/backdrop'
import type { BackdropGen } from '@/models/spx/gen/backdrop-gen'
import { capture, useMessageHandle } from '@/utils/exception'
import { humanizeTimeLeft } from '../common/time-left'
import BackdropSettingInput from './BackdropSettingsInput.vue'
import LayoutWithPreview from '../common/LayoutWithPreview.vue'
import ImagePreview from '../common/ImagePreview.vue'
import ImageSelector from '../common/ImageSelector.vue'
import BackdropImageItem from './BackdropImageItem.vue'

const props = defineProps<{
  gen: BackdropGen
  descriptionPlaceholder?: string
}>()

const emit = defineEmits<{
  finished: [Backdrop]
}>()

const canSubmit = computed(() => props.gen.image != null)
const handleSubmit = useMessageHandle(
  async () => {
    const backdrop = await props.gen.finish()
    props.gen.recordAdoption().catch((err) => {
      capture(err, 'failed to record backdrop asset adoption')
    })
    emit('finished', backdrop)
  },
  {
    en: 'Failed to create backdrop',
    zh: '创建背景失败'
  }
)

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
    v-radar="{ name: 'Backdrop generation', desc: 'Interface for generating and selecting backdrops' }"
    class="backdrop-gen"
  >
    <LayoutWithPreview :has-preview="hasPreview">
      <BackdropSettingInput
        class="settings-input"
        :class="{ 'has-preview': hasPreview }"
        :gen="gen"
        :disabled="handleSubmit.isLoading.value"
        :description-placeholder="descriptionPlaceholder"
      />
      <ImageSelector
        :state="gen.imagesGenState"
        :selected="gen.imageIndex"
        :disabled="handleSubmit.isLoading.value"
        @select="handleImageSelect"
      >
        <template #loading-item>
          <BackdropImageItem loading />
        </template>
        <template #item="{ file, active, onClick }">
          <BackdropImageItem :file="file" :active="active" @click="onClick" />
        </template>
        <template #tip>
          <template v-if="gen.imagesGenState.status === 'running'">
            {{ $t({ en: `Generating backdrops... `, zh: `正在生成背景...` }) }}
            {{ gen.imagesGenState.timeLeft != null ? $t(humanizeTimeLeft(gen.imagesGenState.timeLeft)) : '' }}
          </template>
          <template v-else-if="gen.imagesGenState.status === 'finished'">
            {{
              $t({
                en: 'Select the backdrop you like the most, or generate new ones.',
                zh: '选择你最喜欢的一个背景，或者重新生成。'
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
          name: 'Use',
          desc: 'Finish and use the generated backdrop in the project'
        }"
        color="primary"
        size="large"
        :disabled="!canSubmit"
        :loading="handleSubmit.isLoading.value"
        @click="handleSubmit.fn"
      >
        {{ $t({ en: 'Use', zh: '采用' }) }}
      </UIButton>
    </footer>
  </main>
</template>

<style lang="scss" scoped>
.backdrop-gen {
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
  justify-content: flex-end;
  gap: 16px;
}
</style>
