import { describe, expect, it, vi } from 'vitest'
import type { NavigationFailure, Router } from 'vue-router'
import { exitCurrentTutorial } from './tutorial-exit'
import type { Tutorial } from './tutorial'

function makeTutorial() {
  return {
    endCurrentCourse: vi.fn()
  } as unknown as Tutorial
}

function makeRouter(push: Router['push']) {
  return {
    push
  } as unknown as Router
}

describe('exitCurrentTutorial', () => {
  it('navigates to tutorials before ending current course', async () => {
    const tutorial = makeTutorial()
    const router = makeRouter(vi.fn(async () => undefined))

    const exited = await exitCurrentTutorial(tutorial, router)

    expect(exited).toBe(true)
    expect(router.push).toHaveBeenCalledWith('/tutorials')
    expect(tutorial.endCurrentCourse).toHaveBeenCalledOnce()
  })

  it('keeps current course when navigation is cancelled', async () => {
    const tutorial = makeTutorial()
    const navigationFailure = { type: 4 } as NavigationFailure
    const router = makeRouter(vi.fn(async () => navigationFailure))

    const exited = await exitCurrentTutorial(tutorial, router)

    expect(exited).toBe(false)
    expect(tutorial.endCurrentCourse).not.toHaveBeenCalled()
  })
})
