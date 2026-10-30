import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import type { Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserSessionStorage } from '@/utils/user-storage'
import { ActionException } from '@/utils/exception'
import { makeSignedInMock, makeSignedInUser, makeSignedInUserQuery } from '@/stores/user/test'
import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import type { Copilot } from '@/components/copilot/copilot'
import { Tutorial } from './tutorial'

vi.mock('@/stores/user', () => ({ useSignedIn: () => makeSignedInMock(auth, username) }))
enableAutoUnmount(afterEach)

const course: Course = { id: 'course', owner: 'alice', title: 'First', prompt: '', thumbnail: '', entrypoint: '' }
const series = { id: 'series' } as CourseSeries
let tutorial: Tutorial
let auth: ReturnType<typeof makeSignedInUserQuery>
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
  auth = makeSignedInUserQuery(null, true)
  username = ref<string | null>('alice')
  copilot = {
    endCurrentSession: vi.fn(),
    startSession: vi.fn().mockResolvedValue(null),
    notifyUserEvent: vi.fn(),
    close: vi.fn()
  }
  router = { push: vi.fn().mockResolvedValue(null) }
  mount(
    defineComponent({
      setup() {
        const course = useUserSessionStorage<Course | null>('spx-gui-tutorial-course', null)
        const series = useUserSessionStorage<CourseSeries | null>('spx-gui-tutorial-series', null)
        tutorial = new Tutorial(copilot as unknown as Copilot, router as unknown as Router, ref(true), course, series)
        return () => null
      }
    })
  )
})

function resolveIdentity(nextUsername: string | null) {
  username.value = nextUsername
  auth.data.value = makeSignedInUser(nextUsername)
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
    auth.data.value = { ...auth.data.value!, displayName: 'Updated' }
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
})
