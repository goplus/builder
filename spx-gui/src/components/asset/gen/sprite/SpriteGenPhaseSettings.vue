<!--
  Phase "settings" for sprite-gen:
  * Inputting & enriching settings
  * Generate & select image (default costume)
-->

<script setup lang="ts">
import { computed } from 'vue'
import { UIButton } from '@/components/ui'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import SpriteSettingsInput from './SpriteSettingsInput.vue'
import { useMessageHandle } from '@/utils/exception'
import LayoutWithPreview from '../common/LayoutWithPreview.vue'
import ImagePreview from '../common/ImagePreview.vue'
import ImageSelector from '../common/ImageSelector.vue'
import SpriteImageItem from './SpriteImageItem.vue'
import SpriteLoadingImageItem from './SpriteLoadingImageItem.vue'

const props = defineProps<{
  gen: SpriteGen
}>()

const allowSubmit = computed(() => props.gen.image != null)

const handleSubmit = useMessageHandle(() => props.gen.prepareContent(), {
  en: 'Failed to generate sprite content',
  zh: '生成精灵内容失败'
})
</script>

<template>
  <main class="phase-settings">
    <LayoutWithPreview :has-preview="gen.image != null">
      <SpriteSettingsInput :gen="gen" />
      <ImageSelector :state="gen.imagesGenState" :selected="gen.image" @select="gen.setImage($event)">
        <template #loading-item>
          <SpriteLoadingImageItem />
        </template>
        <template #item="{ file, active, select }">
          <SpriteImageItem :file="file" :active="active" @click="select(file)" />
        </template>
        <template #tip>
          {{
            $t({
              en: 'Select the sprite you like the most, or generate new ones.',
              zh: '选择你最喜欢的一个精灵，或者重新生成。'
            })
          }}
        </template>
      </ImageSelector>

      <template #preview>
        <ImagePreview :file="gen.image" />
      </template>
    </LayoutWithPreview>
    <footer class="footer">
      <UIButton
        color="primary"
        size="large"
        :disabled="!allowSubmit"
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
