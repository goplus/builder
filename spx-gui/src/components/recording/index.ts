import RecordingEditModal from './RecordingEditModal.vue'
import { useConfirmDialog, useModal } from '@/components/ui'
import { deleteRecording } from '@/apis/recording'
import { useI18n } from '@/utils/i18n'

export function useEditRecording() {
  const modal = useModal(RecordingEditModal)

  return function editRecording(recording: any) {
    return modal({ recording })
  }
}

export function useRemoveRecording() {
  const { t } = useI18n()
  const withConfirm = useConfirmDialog()

  return async function removeRecording(id: string, title: string) {
    return withConfirm({
      title: t({ en: `Remove recording ${title}`, zh: `删除录屏 ${title}` }),
      content: t({
        en: `Removed recordings can not be recovered. Are you sure you want to remove recording ${title}?`,
        zh: `删除后的录屏无法恢复，确定要删除录屏 ${title} 吗？`
      }),
      confirmHandler: () => deleteRecording(id)
    })
  }
}