import { initiateSignIn, isSignedIn } from '@/stores/user'
import { useI18n } from './i18n'
import { useConfirmDialog } from '@/components/ui'
import { Cancelled } from './exception'

export function useEnsureSignedIn() {
  const { t } = useI18n()
  const withConfirm = useConfirmDialog()

  return async () => {
    if (isSignedIn()) return
    await withConfirm({
      title: t({ en: 'Sign in to continue', zh: '登录以继续' }),
      content: t({
        en: 'You need to sign in first to perform this action. Would you like to sign in now?',
        zh: '你需要先登录才能执行此操作。你想现在登录吗？'
      }),
      confirmText: t({ en: 'Sign in', zh: '登录' }),
      confirmHandler: () => initiateSignIn()
    })
    throw new Cancelled('redirected to sign in')
  }
}
