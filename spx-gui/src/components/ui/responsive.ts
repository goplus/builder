import { onUnmounted, ref } from 'vue'

export type ReponsiveSize = 'mobile' | 'tablet' | 'desktop' | 'desktop-large'

function getQuery(size: ReponsiveSize) {
  let query: string
  switch (size) {
    // Note: remember to keep these values in sync with the breakpoints in ./responsive.scss
    case 'mobile':
      query = '(max-width: 767px)'
      break
    case 'tablet':
      query = '(min-width: 768px) and (max-width: 1279px)'
      break
    case 'desktop':
      query = '(min-width: 1280px) and (max-width: 1679px)'
      break
    case 'desktop-large':
      query = '(min-width: 1680px)'
      break
  }
  return query
}

export function useResponsive(size: ReponsiveSize) {
  const query = getQuery(size)
  const mqList = window.matchMedia(query)
  const isMatched = ref(mqList.matches)
  function onMQListChange(event: MediaQueryListEvent) {
    isMatched.value = event.matches
  }

  mqList.addEventListener('change', onMQListChange)
  onUnmounted(() => mqList.removeEventListener('change', onMQListChange))
  return isMatched
}
