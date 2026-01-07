import { useModal } from '../modal'
import UIConfirmDialog, { type Props as UIConfirmDialogProps } from './UIConfirmDialog.vue'

export { UIConfirmDialog }

export type ConfirmOptions = Omit<UIConfirmDialogProps, 'visible'>

/**
 * Show a confirm dialog with the given options.
 * The returned promise resolves if confirmed, rejects with exception `Cancelled` if cancelled.
 */
export function useConfirmDialog() {
  const openConfirmDialog = useModal(UIConfirmDialog)
  return async function withConfirm(options: ConfirmOptions) {
    await openConfirmDialog(options)
  }
}
