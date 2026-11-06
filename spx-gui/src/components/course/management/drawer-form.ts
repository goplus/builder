import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useConfirmDialog } from '@/components/ui'

/**
 * For a drawer holding a form: whether the form has changed since the drawer opened, and asking before closing it
 * would lose the changes. `confirmDiscard` throws `Cancelled` when the author keeps them.
 *
 * The values are compared as JSON, so they must survive it unchanged: plain strings, numbers, booleans, arrays and
 * objects, with keys in a stable order; `undefined`, dates and the like would compare wrongly.
 */
export function useDrawerFormChanges(getValues: () => unknown) {
  const i18n = useI18n()
  const confirm = useConfirmDialog()
  const initial = JSON.stringify(getValues())
  const changed = computed(() => JSON.stringify(getValues()) !== initial)

  async function confirmDiscard() {
    if (!changed.value) return
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Discard changes?', zh: '放弃修改？' }),
      content: i18n.t({ en: 'The changes you made will not be saved.', zh: '所做的修改将不会保存。' }),
      confirmText: i18n.t({ en: 'Discard', zh: '放弃' })
    })
  }

  return { changed, confirmDiscard }
}
