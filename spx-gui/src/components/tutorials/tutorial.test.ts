import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionException, Cancelled } from '@/utils/exception'
import { makeSignedInMock, makeSignedInState, makeSignedInStateQuery } from '@/stores/user/test'
import type { SignedIn } from '@/stores/user'
import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import type { Copilot } from '@/components/copilot/copilot'
import { Tutorial } from './tutorial'

const course: Course = { id: 'course', owner: 'alice', title: 'First', prompt: '', thumbnail: '', entrypoint: '' }
const series = { id: 'series' } as CourseSeries
let tutorial: Tutorial
let auth: ReturnType<typeof makeSignedInStateQuery>
let username = ref<string | null>('alice')
let copilot: {
  endCurrentSession: ReturnType<typeof vi.fn>
  startSession: ReturnType<typeof vi.fn>
  notifyUserEvent: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}
let router: { push: ReturnType<typeof vi.fn> }
beforeEach(() => {
  sessionStorage.clear()
  auth = makeSignedInStateQuery(null)
  username = ref<string | null>('alice')
  copilot = {
    endCurrentSession: vi.fn(),
    startSession: vi.fn().mockResolvedValue(null),
    notifyUserEvent: vi.fn(),
    close: vi.fn()
  }
  router = { push: vi.fn().mockResolvedValue(null) }
  tutorial = new Tutorial(
    copilot as unknown as Copilot,
    router as unknown as Router,
    ref(true),
    makeSignedInMock(auth, username) as SignedIn
  )
})
afterEach(() => {
  tutorial.dispose()
  vi.useRealTimers()
})

function resolveIdentity(nextUsername: string | null) {
  username.value = nextUsername
  auth.data.value = makeSignedInState(nextUsername)
  auth.isLoading.value = false
}

describe('tutorial persistence and identity', () => {
  it('restores account storage while user information is loading or failed', async () => {
    const saved = JSON.stringify({ __user__: 'alice', __value__: course })
    sessionStorage.setItem('spx-gui-tutorial-course', saved)
    expect(tutorial.currentCourse?.id).toBe(course.id)
    expect(sessionStorage.getItem('spx-gui-tutorial-course')).toBe(saved)
    auth.error.value = new ActionException(new Error('offline'), { en: 'Failed', zh: '失败' })
    auth.isLoading.value = false
    expect(tutorial.currentCourse?.id).toBe(course.id)
    expect(sessionStorage.getItem('spx-gui-tutorial-course')).toBe(saved)
    auth.error.value = null
    resolveIdentity('alice')
    expect(tutorial.currentCourse?.id).toBe(course.id)
    const restored = tutorial.currentCourse
    auth.data.value = { isSignedIn: true, user: { ...auth.data.value!.user!, displayName: 'Updated' } }
    await flushPromises()
    expect(tutorial.currentCourse).toBe(restored)
  })

  it('starts and persists a course using the local username before user information loads', async () => {
    const starting = tutorial.startCourse(course, series)
    await flushPromises()
    expect(auth.data.value).toBeNull()
    await starting
    expect(copilot.startSession).toHaveBeenCalledOnce()
    expect(JSON.parse(sessionStorage.getItem('spx-gui-tutorial-course')!).__user__).toBe('alice')
  })

  it('does not launch an old course after the account changes during navigation', async () => {
    vi.useFakeTimers()
    resolveIdentity('alice')
    let finishNavigation!: () => void
    router.push.mockReturnValue(
      new Promise<void>((resolve) => {
        finishNavigation = resolve
      })
    )
    const starting = tutorial.startCourse({ ...course, entrypoint: '/editor/alice/project' }, series)
    const rejected = expect(starting).rejects.toBeInstanceOf(Cancelled)
    await flushPromises()
    resolveIdentity('bob')
    finishNavigation()
    await vi.advanceTimersByTimeAsync(110)
    await rejected
    expect(copilot.startSession).not.toHaveBeenCalled()
    expect(copilot.notifyUserEvent).not.toHaveBeenCalled()
  })
})
