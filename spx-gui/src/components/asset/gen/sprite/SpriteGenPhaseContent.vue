<script setup lang="ts">
import { capture } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import type { SpriteGen, SpriteGenResult } from '@/models/spx/gen/sprite-gen'
import { useConfirmDialog } from '@/components/ui'
import SpriteContentEditor from '../../sprite/SpriteContentEditor.vue'

const props = defineProps<{
  gen: SpriteGen
}>()

const emit = defineEmits<{
  collapse: []
  resolved: [SpriteGenResult]
}>()

const { t } = useI18n()
const confirm = useConfirmDialog()

async function confirmAddingMore() {
  const { costumes, animations } = props.gen
  if (
    costumes.filter((costume) => costume.result != null).length !== 1 ||
    animations.some((animation) => animation.result != null) ||
    costumes.length + animations.length <= 1
  )
    return
  await confirm({
    type: 'info',
    title: t({ zh: '采用精灵', en: 'Use sprite' }),
    content: t({
      zh: '添加更多造型或动画可以让你的精灵更加生动。确定不添加，直接采用吗？',
      en: 'Adding more costumes or animations can make your sprite more lively. Are you sure to use it directly without adding more?'
    }),
    cancelText: t({ zh: '继续添加', en: 'Continue adding' }),
    confirmText: t({ zh: '直接采用', en: 'Use directly' })
  })
}

async function handleSubmit() {
  const sprite = await props.gen.finish()
  props.gen.recordAdoption().catch((err) => {
    capture(err, 'failed to record sprite asset adoption')
  })
  emit('resolved', { sprite, contentSettings: null })
}
</script>

<template>
  <SpriteContentEditor
    :content="gen"
    :submit="handleSubmit"
    :before-submit="confirmAddingMore"
    @collapse="emit('collapse')"
  />
</template>
