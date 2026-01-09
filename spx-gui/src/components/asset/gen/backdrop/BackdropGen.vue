<script setup lang="ts">
import { computed } from 'vue'
import { UIButton } from '@/components/ui'
import type { Backdrop } from '@/models/backdrop'
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import { useMessageHandle } from '@/utils/exception'
import BackdropSettingInput from './BackdropSettingsInput.vue'
import LayoutWithPreview from '../common/LayoutWithPreview.vue'
import ImagePreview from '../common/ImagePreview.vue'
import ImageSelector from '../common/ImageSelector.vue'
import BackdropImageItem from './BackdropImageItem.vue'
import BackdropLoadingImageItem from './BackdropLoadingImageItem.vue'

const props = defineProps<{
  gen: BackdropGen
}>()

const emit = defineEmits<{
  finished: [Backdrop]
}>()

const canSubmit = computed(() => props.gen.image != null)
const handleSubmit = useMessageHandle(
  async () => {
    const backdrop = await props.gen.finish()
    emit('finished', backdrop)
  },
  {
    en: 'Failed to create backdrop',
    zh: '创建背景失败'
  }
)
</script>

<template>
  <main class="backdrop-gen">
    <LayoutWithPreview :has-preview="gen.image != null">
      <BackdropSettingInput :gen="gen" :disabled="handleSubmit.isLoading.value" />
      <ImageSelector :state="gen.imagesGenState" :selected="gen.image" @select="gen.setImage($event)">
        <template #loading-item>
          <BackdropLoadingImageItem />
        </template>
        <template #item="{ file, active, select }">
          <BackdropImageItem :file="file" :active="active" @click="select(file)" />
        </template>
        <template #tip>
          {{
            $t({
              en: 'Select the backdrop you like the most, or generate new ones.',
              zh: '选择你最喜欢的一个背景，或者重新生成。'
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
        :disabled="!canSubmit"
        :loading="handleSubmit.isLoading.value"
        @click="handleSubmit.fn"
        >{{ $t({ en: 'Use', zh: '采用' }) }}</UIButton
      >
    </footer>
  </main>
</template>

<style lang="scss" scoped>
.backdrop-gen {
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
  justify-content: flex-end;
  gap: 16px;
}
</style>
