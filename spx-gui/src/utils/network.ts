import { ref, onMounted, onUnmounted } from 'vue'

export function useNetwork() {
  const isOnline = ref(navigator.onLine)

  const updateNetworkStatus = () => {
    isOnline.value = navigator.onLine
  }

  onMounted(() => {
    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)
  })

  onUnmounted(() => {
    window.removeEventListener('online', updateNetworkStatus)
    window.removeEventListener('offline', updateNetworkStatus)
  })

  return { isOnline }
}
