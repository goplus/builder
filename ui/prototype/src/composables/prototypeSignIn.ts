import { ref } from 'vue'

const signInModalOpen = ref(false)

export function usePrototypeSignIn() {
  function openSignInModal() {
    signInModalOpen.value = true
  }

  function closeSignInModal() {
    signInModalOpen.value = false
  }

  return {
    signInModalOpen,
    openSignInModal,
    closeSignInModal
  }
}
