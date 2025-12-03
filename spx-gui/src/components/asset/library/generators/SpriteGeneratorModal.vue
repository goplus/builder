<template>
  <UIFormModal
    :title="$t({ en: 'Generate Sprite', zh: '生成精灵' })"
    :visible="props.visible"
    style="width: 928px"
    @update:visible="handleModalClose"
  >
    <div class="generator-content">
      <SpriteGenerator
        ref="generatorRef"
        :project="props.project"
        :settings="props.settings"
        :saved-state="props.savedState"
        @generated="handleGenerated"
        @hide="handleHide"
      />
    </div>
  </UIFormModal>
</template>

<script lang="ts">
import type { Sprite } from '@/models/sprite'
import type { SpriteGeneratorState } from './SpriteGenerator.vue'

export type SpriteGeneration = {
  type: 'sprite-generation'
  state: SpriteGeneratorState
}

export function isSpriteGeneration(value: Sprite | SpriteGeneration): value is SpriteGeneration {
  return (value as SpriteGeneration).type === 'sprite-generation'
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { UIFormModal, useConfirmDialog } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import type { Project } from '@/models/project'
import type { AssetSettings } from '@/models/common/asset'
import SpriteGenerator from './SpriteGenerator.vue'

const props = defineProps<{
  visible: boolean
  project: Project
  settings?: AssetSettings
  savedState?: SpriteGeneratorState
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [result: Sprite | SpriteGeneration]
}>()

const { t } = useI18n()
const confirm = useConfirmDialog()

const generatorRef = ref<InstanceType<typeof SpriteGenerator>>()

async function handleModalClose(visible: boolean) {
  if (visible) return

  try {
    await confirm({
      title: t({ en: 'Hide generation?', zh: '收起生成？' }),
      content: t({
        en: 'The sprite is being generated. Do you want to hide and continue in the background?',
        zh: '精灵正在生成中，是否收起并在后台继续？'
      }),
      confirmText: t({ en: 'Hide', zh: '收起' }),
      cancelText: t({ en: 'Discard', zh: '丢弃' })
    })
    handleHide()
  } catch {
    emit('cancelled')
  }
}

function handleGenerated(sprite: Sprite) {
  emit('resolved', sprite)
}

function handleHide() {
  const state = generatorRef.value?.getState()
  if (state == null) return
  const generation: SpriteGeneration = {
    type: 'sprite-generation',
    state
  }
  emit('resolved', generation)
}
</script>

<style lang="scss" scoped>
.generator-content {
  min-height: 400px;
}
</style>
