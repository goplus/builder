import type { Router } from 'vue-router'
import type { Tutorial } from './tutorial'

export async function exitCurrentTutorial(tutorial: Tutorial, router: Router) {
  const navigationFailure = await router.push('/tutorials')
  if (navigationFailure) return false
  tutorial.endCurrentCourse()
  return true
}
