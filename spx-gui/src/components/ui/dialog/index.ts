import { useModal } from '../modal'
import UIConfirmDialog, { type Props as UIConfirmDialogProps } from './UIConfirmDialog.vue'

export { default as UIDialog } from './UIDialog.vue'
export { UIConfirmDialog }

export type ConfirmOptions = Omit<UIConfirmDialogProps, 'visible'>

export function useConfirmDialog() {
  const openConfirmDialog = useModal(UIConfirmDialog)
  return async function withConfirm(options: ConfirmOptions) {
    await openConfirmDialog(options)
  }
}
