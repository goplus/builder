import { useModal } from '@/components/ui'
import ModificationWarningModal from '@/components/common/ModificationWarningModal.vue'
import ModifyUsernameModal from './ModifyUsernameModal.vue'

/**
 * Modify username for the signed-in user.
 * NOTE: The signed-in user will be signed out after modifying the username.
 * Typically the caller may want to reload the route to trigger navigation guards or initiate sign-in manually.
 */
export function useModifyUsername() {
  const warningModal = useModal(ModificationWarningModal)
  const modifyUsernameModal = useModal(ModifyUsernameModal)

  return async function modifyUsername(username: string) {
    await warningModal({
      radar: { name: 'Username warning modal', desc: 'Warning modal shown before modifying username' },
      title: { en: 'Modify username', zh: '修改用户名' },
      tip: { en: 'Modifying the username may have the following impacts.', zh: '修改用户名可能造成以下影响。' },
      items: [
        {
          en: 'You will be signed out and need to sign in again to continue your work.',
          zh: '您将会被登出，需要重新登录才能继续使用。'
        },
        {
          en: 'Your profile, project page, and editor URLs will change to use the new username.',
          zh: '您的个人主页、项目页和编辑页链接将会切换为新的用户名。'
        },
        {
          en: 'Existing links should currently redirect to the new address, but may stop pointing to your account or projects if the old username is claimed again in the future.',
          zh: '现有链接当前通常会自动跳转到新地址，但如果旧用户名将来被重新占用，这些链接可能不再指向您的账号或项目。'
        },
        {
          en: 'This operation may take a moment to complete.',
          zh: '该操作可能需要一点时间才能完成。'
        }
      ],
      confirmText: { en: 'I understand, let me modify the username', zh: '我已知晓，让我修改用户名' },
      confirmRadar: { name: 'Continue button', desc: 'Click to continue modifying username' },
      modalStyle: { width: '560px' }
    })
    return modifyUsernameModal({ username })
  }
}
