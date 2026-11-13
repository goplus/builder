import { Cancelled } from '@/utils/exception'
import { useModal } from '../modal'
import UIDialog from './UIDialog.vue'
import UIConfirmDialog, { type Props as UIConfirmDialogProps } from './UIConfirmDialog.vue'

export { UIDialog, UIConfirmDialog }

export type ConfirmOptions = Omit<UIConfirmDialogProps, 'visible'>

/**
 * Show a confirm dialog with the given options.
 * The returned promise resolves if confirmed, rejects with exception `Cancelled` if cancelled.
 */
export function useConfirmDialog() {
  const openConfirmDialog = useModal(UIConfirmDialog)
  return async function confirm(options: ConfirmOptions) {
    await openConfirmDialog(options)
  }
}

/**
 * Show a confirm dialog with the given options.
 * The returned promise resolves with `true` if confirmed, `false` if cancelled.
 */
export function useConfirmDialogWithResult() {
  const openConfirmDialog = useModal(UIConfirmDialog)
  return function confirmWithResult(options: ConfirmOptions): Promise<boolean> {
    return openConfirmDialog(options).then(
      () => true,
      (e) => {
        if (e instanceof Cancelled) return false
        throw e
      }
    )
  }
}
