import { onUnmounted, ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { Cancelled } from '@/utils/exception'

/**
 * Keep a page while the dialogs it opened are open. Dialogs live above the routes, so a page left with one open would
 * leave it over another page, still acting for the page that opened it, as by navigating once it is done; nor could a
 * drawer that is saving be closed safely. Leaving the page, or going to another path of its route, waits until none of
 * them is open, and one that outlives the page all the same ends in `Cancelled`, so that nothing follows it.
 */
export function usePageModals() {
  const openCount = ref(0)
  let unmounted = false
  onUnmounted(() => (unmounted = true))
  onBeforeRouteLeave(() => openCount.value === 0)
  onBeforeRouteUpdate((to, from) => to.path === from.path || openCount.value === 0)

  /** What the dialog `opened` resolves to, the page kept until it does. */
  async function keepPageFor<T>(opened: Promise<T>): Promise<T> {
    openCount.value++
    try {
      const result = await opened
      if (unmounted) throw new Cancelled('page left')
      return result
    } finally {
      openCount.value--
    }
  }

  return { keepPageFor }
}
