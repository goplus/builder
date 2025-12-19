<script lang="ts" setup>
import { UIButton } from '@/components/ui'
import GenModal from '../common/GenModal.vue'
import { SpriteGen } from '@/models/gen/sprite-gen'
import SpriteSettingInput from './SpriteSettingInput.vue'
import { Project } from '@/models/project'

defineProps<{
  visible: boolean
  // spriteGen: SpriteGen
}>()

// mock
const spriteGen = new SpriteGen(new Project(), '')

const emit = defineEmits<{
  resolved: [void]
  cancelled: []
}>()

function nextGenerate() {}
</script>

<template>
  <GenModal
    :title="$t({ zh: '生成精灵', en: 'Sprite Generator' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <template #left>
      <UIButton color="white" variant="stroke" type="link">{{
        $t({ zh: '返回素材库', en: 'Back to Assets' })
      }}</UIButton>
    </template>

    <div class="content">
      <SpriteSettingInput :sprite-gen="spriteGen"></SpriteSettingInput>
    </div>
    <!-- gen results -->

    <template #footer>
      <UIButton @click="nextGenerate">{{ $t({ zh: '下一步', en: 'Next' }) }}</UIButton>
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
