<script lang="ts" setup>
import { UIButton } from '@/components/ui'
import GenModal from '../common/GenModal.vue'
import { SpriteGen } from '@/models/gen/sprite-gen'
import SpriteSettingInput from './SpriteSettingInput.vue'
import { useSpriteGenModal } from '@/components/asset/index'
import type { Project } from '@/models/project'

const props = defineProps<{
  visible: boolean
  spriteGen: SpriteGen
  project: Project
}>()

const emit = defineEmits<{
  resolved: [void]
  cancelled: []
}>()

const spriteGenModal = useSpriteGenModal()
async function nextGenerate() {
  await props.spriteGen.generateContent()
  emit('resolved')
  spriteGenModal(props.spriteGen)
}

function backToAssets() {}
</script>

<template>
  <GenModal
    :title="$t({ zh: '生成精灵', en: 'Sprite Generator' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <template #left>
      <UIButton color="white" variant="stroke" @click="backToAssets">{{
        $t({ zh: '返回素材库', en: 'Back to Assets' })
      }}</UIButton>
    </template>

    <div class="content">
      <SpriteSettingInput :sprite-gen="spriteGen"></SpriteSettingInput>
    </div>
    <!-- gen results -->

    <template #footer>
      <UIButton :loading="spriteGen.generateContentState.state === 'running'" @click="nextGenerate">{{
        $t({ zh: '下一步', en: 'Next' })
      }}</UIButton>
    </template>
  </GenModal>
</template>

<style lang="scss" scoped>
.content {
  margin: 100px auto;
  display: flex;
  justify-content: center;
  width: 500px;
}
</style>
