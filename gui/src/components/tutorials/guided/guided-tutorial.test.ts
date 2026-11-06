import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import type { Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionException } from '@/utils/exception'
import { createReadinessScope } from '@/utils/readiness'
import { useUserSessionStorage } from '@/utils/user-storage'
import type { GuidedCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { makeSignedInMock, makeSignedInUser, makeSignedInUserQuery } from '@/stores/user/test'
import type { Copilot } from '@/components/copilot/copilot'
import { GuidedTutorial } from './guided-tutorial'

vi.mock('@/stores/user', () => ({ useSignedIn: () => makeSignedInMock(auth, username) }))
enableAutoUnmount(afterEach)

const course = {
  id: 'course',
  owner: 'alice',
  kind: 'guided',
  title: 'First',
  content: { prompt: 'Learn Builder', entrypoint: '' }
} as GuidedCourse
const series = { id: 'series' } as CourseSeries
let tutorial: GuidedTutorial
let auth: ReturnType<typeof makeSignedInUserQuery>
let username = ref<string | null>('alice')
let copilot: {
  endCurrentSession: ReturnType<typeof vi.fn>
  startSession: ReturnType<typeof vi.fn>
  notifyUserEvent: ReturnType<typeof vi.fn>
  open: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  sessionStorage.clear()
  auth = makeSignedInUserQuery(null, true)
  username = ref<string | null>('alice')
  copilot = {
    endCurrentSession: vi.fn(),
    startSession: vi.fn().mockResolvedValue(null),
    notifyUserEvent: vi.fn(),
    open: vi.fn(),
    close: vi.fn()
  }
  const router = { replace: vi.fn().mockResolvedValue(null) }
  mount(
    defineComponent({
      setup() {
        const course = useUserSessionStorage<Pick<GuidedCourse, 'id'> | null>('spx-gui-tutorial-course', null)
        const series = useUserSessionStorage<Pick<CourseSeries, 'id'> | null>('spx-gui-tutorial-series', null)
        tutorial = new GuidedTutorial(
          copilot as unknown as Copilot,
          router as unknown as Router,
          createReadinessScope(),
          course,
          series
        )
        return () => null
      }
    })
  )
})

describe('Guided Tutorial persistence and identity', () => {
  it.each([false, true])(
    'restores account storage while user information is loading or failed (legacy: %s)',
    async (legacy) => {
      const saved = JSON.stringify({ __user__: 'alice', __value__: legacy ? course : { id: course.id } })
      sessionStorage.setItem('spx-gui-tutorial-course', saved)
      sessionStorage.setItem('spx-gui-tutorial-series', JSON.stringify({ __user__: 'alice', __value__: series }))
      expect(tutorial.currentCourse?.courseID).toBe(course.id)
      auth.error.value = new ActionException(new Error('offline'), { en: 'Failed', zh: '失败' })
      auth.isLoading.value = false
      expect(tutorial.currentCourse?.courseID).toBe(course.id)
      expect(sessionStorage.getItem('spx-gui-tutorial-course')).toBe(saved)
      auth.error.value = null
      auth.data.value = makeSignedInUser('alice')
      await flushPromises()
      expect(tutorial.currentCourse?.courseID).toBe(course.id)
    }
  )

  it('starts and persists a course before user information loads', async () => {
    await tutorial.enterCourse(course, series)
    expect(auth.data.value).toBeNull()
    expect(copilot.startSession).toHaveBeenCalledOnce()
    expect(JSON.parse(sessionStorage.getItem('spx-gui-tutorial-course')!)).toEqual({
      __user__: 'alice',
      __value__: { id: course.id }
    })
    expect(JSON.parse(sessionStorage.getItem('spx-gui-tutorial-series')!)).toEqual({
      __user__: 'alice',
      __value__: { id: series.id }
    })
  })
})
