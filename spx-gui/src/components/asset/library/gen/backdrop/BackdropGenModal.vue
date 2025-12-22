<script lang="ts" setup>
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import GenModal from '../common/GenModal.vue'
import GenPanel from '../common/GenPanel.vue'
import { UIBlockItem, UIBlockItemTitle, UIButton } from '@/components/ui'
import BackdropSettingInput from './BackdropSettingInput.vue'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'
import BackdropGenPreview from './BackdropGenPreview.vue'

defineProps<{
  visible: boolean
  backdropGen: BackdropGen
}>()

const emit = defineEmits<{
  resolved: [void]
  cancelled: []
}>()
</script>

<template>
  <GenModal
    :title="$t({ zh: '生成背景', en: 'Backdrop Generator' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <GenPanel>
      <template #left>
        <UIBlockItem active>
          <UIBlockItemTitle size="large">backdrop</UIBlockItemTitle>
        </UIBlockItem>

        <BackdropSettingInput class="backdrop-setting-input" :backdrop-gen="backdropGen"></BackdropSettingInput>
      </template>
      <template #right>
        <div class="gen-preview">
          <CheckerboardBackground class="background" />
          <BackdropGenPreview :backdrop-gen="backdropGen" />
        </div>
      </template>
    </GenPanel>
    <template #footer>
      <UIButton color="secondary">{{ $t({ zh: '收起', en: 'Collapse' }) }}</UIButton>
      <UIButton>{{ $t({ zh: '采用', en: 'Use' }) }}</UIButton>
    </template>
  </GenModal>
</template>

<style lang="scss" scoped>
.backdrop-setting-input {
  margin-top: 80px;
}

.gen-preview {
  flex: 1;
  margin: 20px 24px;
  position: relative;
  border-radius: var(--ui-border-radius-1);
  overflow: hidden;

  .background {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
}
</style>
