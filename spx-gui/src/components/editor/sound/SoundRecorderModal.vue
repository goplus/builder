<template>
  <UIFormModal
    :radar="{ name: 'Sound recorder modal', desc: 'Modal for recording sounds' }"
    :visible="visible"
    :title="$t({ en: 'Record Sound', zh: '录制声音' })"
    center-title
    @update:visible="handleFormModalVisibleUpdate"
  >
    <SoundRecorder :project="project" @saved="handleSaved" @record-started="recordStarted = true" />
  </UIFormModal>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import type { Sound } from '@/models/sound'
import type { Project } from '@/models/project'
import { UIFormModal, useConfirmDialog } from '@/components/ui'
import SoundRecorder from './SoundRecorder.vue'

const recordStarted = ref(false)

defineProps<{
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  resolved: [sound: Sound]
  cancelled: []
}>()

const i18n = useI18n()
const withConfirm = useConfirmDialog()

const handleFormModalVisibleUpdate = useMessageHandle(async (visible: boolean) => {
  if (visible) return
  if (recordStarted.value) {
    await withConfirm({
      type: 'warning',
      title: i18n.t({ en: 'Quit recording?', zh: '退出录音？' }),
      content: i18n.t({
        en: 'The current content will not be saved. Are you sure you want to quit?',
        zh: '当前内容不会被保存，确定要退出吗？'
      })
    })
  }
  emit('cancelled')
}).fn

function handleSaved(sound: Sound) {
  emit('resolved', sound)
}
</script>
