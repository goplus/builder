<script setup lang="ts">
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import GenPanel from '../common/GenPanel.vue'
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import BackdropSettingInput from './BackdropSettingsInput.vue'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'

defineProps<{
  gen: BackdropGen
}>()
</script>

<template>
  <GenPanel>
    <template #left>
      <UIBlockItem active>
        <UIBlockItemTitle size="large">backdrop</UIBlockItemTitle>
      </UIBlockItem>

      <BackdropSettingInput class="backdrop-setting-input" :gen="gen"></BackdropSettingInput>
    </template>
    <template #right>
      <div class="gen-preview">
        <CheckerboardBackground class="background" />
        backdrop preview
      </div>
    </template>
  </GenPanel>
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
