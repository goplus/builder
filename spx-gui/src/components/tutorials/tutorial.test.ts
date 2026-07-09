import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Router } from 'vue-router'
import type { Copilot } from '@/components/copilot/copilot'
import { editorLeaveConfirm } from '@/components/editor/leave-confirm'
import { editorReload } from '@/components/editor/editor-reload'
import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { Tutorial } from './tutorial'

function makeCopilot() {
  return {
    startSession: vi.fn(),
    endCurrentSession: vi.fn(),
    notifyUserEvent: vi.fn(),
    close: vi.fn()
  } as unknown as Copilot
}

function makeRouter(push: (to: string) => Promise<unknown>) {
  return { push } as unknown as Router
}

function makeCourse(): Course {
  return {
    id: 'course-1',
    owner: 'owner',
    title: 'Course 1',
    thumbnail: '',
    // Empty entrypoint so `startCourse` does not need to navigate
    entrypoint: '',
    references: [],
    prompt: 'prompt'
  }
}

function makeCourseSeries(): CourseSeries {
  return {
    id: 'series-1',
    owner: 'owner',
    title: 'Series 1',
    thumbnail: '',
    description: '',
    courseIDs: ['course-1'],
    order: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
}

describe('Tutorial', () => {
  beforeEach(() => {
    sessionStorage.clear()
    // Consume any pending skip request left by a previous test
    editorLeaveConfirm.consumeSkipOnce()
  })

  describe('exitCurrentCourse', () => {
    it('should navigate to the tutorials page and end the course', async () => {
      const push = vi.fn(async () => undefined)
      const tutorial = new Tutorial(makeCopilot(), makeRouter(push), ref(true))
      await tutorial.startCourse(makeCourse(), makeCourseSeries())
      expect(tutorial.currentCourse).not.toBeNull()

      await tutorial.exitCurrentCourse()
      expect(push).toHaveBeenCalledWith('/tutorials')
      expect(tutorial.currentCourse).toBeNull()
      expect(tutorial.currentSeries).toBeNull()
      // The leave confirmation is expected to be skipped for the exit navigation
      expect(editorLeaveConfirm.consumeSkipOnce()).toBe(true)
    })

    it('should keep the course when the navigation is aborted', async () => {
      const push = vi.fn(async () => ({ type: 'aborted' })) // a `NavigationFailure`-like result
      const tutorial = new Tutorial(makeCopilot(), makeRouter(push), ref(true))
      await tutorial.startCourse(makeCourse(), makeCourseSeries())

      await tutorial.exitCurrentCourse()
      expect(tutorial.currentCourse).not.toBeNull()
      expect(tutorial.currentSeries).not.toBeNull()
    })
  })

  describe('restartCurrentCourse', () => {
    it('should request an editor reload and start the course over', async () => {
      const copilot = makeCopilot()
      const tutorial = new Tutorial(
        copilot,
        makeRouter(async () => undefined),
        ref(true)
      )
      await tutorial.startCourse(makeCourse(), makeCourseSeries())

      const reloadCounterBefore = editorReload.counter
      await tutorial.restartCurrentCourse()
      expect(editorReload.counter).toBe(reloadCounterBefore + 1)
      expect(copilot.startSession).toHaveBeenCalledTimes(2)
      expect(tutorial.currentCourse).not.toBeNull()
      expect(tutorial.currentSeries).not.toBeNull()
    })

    it('should throw when no course is in progress', async () => {
      const tutorial = new Tutorial(
        makeCopilot(),
        makeRouter(async () => undefined),
        ref(true)
      )
      await expect(tutorial.restartCurrentCourse()).rejects.toThrow('No course in progress')
    })
  })
})
