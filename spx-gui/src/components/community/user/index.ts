import { useModal } from '@/components/ui'
import ModificationWarningModal from '@/components/common/ModificationWarningModal.vue'
import ModifyUsernameModal from './ModifyUsernameModal.vue'

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
          en: 'Your profile page URL will change, and existing links to your profile may no longer work.',
          zh: '您的个人主页 URL 将会变更，原有主页链接可能无法继续访问。'
        },
        {
          en: 'Project URLs that include your username, including project pages and editor routes, will also change.',
          zh: '包含您用户名的项目链接（包括项目页和编辑页）也会随之变更。'
        },
        {
          en: 'Existing sharing links to your projects may become invalid.',
          zh: '已分享出去的项目链接可能会失效。'
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
