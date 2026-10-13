import { isSignedIn, useSignIn } from '@/stores/user'
import { useI18n, type LocaleMessage } from './i18n'
import { useConfirmDialog } from '@/components/ui'
import { Cancelled } from './exception'

/** Ensure sign-in with a confirmation dialog. */
export function useEnsureSignedIn() {
  const { t } = useI18n()
  const withConfirm = useConfirmDialog()
  const signIn = useSignIn()

  return async (
    options: {
      /** Post-sign-in destination; defaults to the current URL when omitted. */
      returnTo?: string
      /** Confirmation body text; defaults to the generic sign-in prompt when omitted. */
      content?: LocaleMessage
    } = {}
  ) => {
    if (isSignedIn()) return
    await withConfirm({
      title: t({ en: 'Please sign in', zh: '请先登录' }),
      content: t(
        options.content ?? {
          en: 'You need to sign in first to perform this action. Would you like to sign in now?',
          zh: '你需要先登录才能执行此操作。你想现在登录吗？'
        }
      ),
      confirmText: t({ en: 'Sign in', zh: '登录' }),
      confirmHandler: () => signIn(options.returnTo)
    })
    throw new Cancelled('redirected to sign in')
  }
}
