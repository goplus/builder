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
    close: vi.fn(),
    open: vi.fn()
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

  describe('startCourse', () => {
    it('should load the editor but keep Copilot inactive until the opening is continued', async () => {
      const copilot = makeCopilot()
      const push = vi.fn(async () => undefined)
      const tutorial = new Tutorial(copilot, makeRouter(push), ref(true))
      const course = { ...makeCourse(), entrypoint: '/editor/owner/project/sprites/Lita/code' }

      await tutorial.prepareCourse(course, makeCourseSeries(), [{ kind: 'story-video', src: '/story.mp4' }])

      expect(push).toHaveBeenCalledWith(course.entrypoint)
      expect(tutorial.currentCourseOpeningStep).toEqual({ kind: 'story-video', src: '/story.mp4' })
      expect(tutorial.courseActivated).toBe(false)
      expect(copilot.close).toHaveBeenCalledOnce()
      expect(copilot.startSession).not.toHaveBeenCalled()

      await tutorial.advanceCourseOpening()

      expect(tutorial.currentCourseOpeningStep).toBeNull()
      expect(tutorial.courseActivated).toBe(true)
      expect(copilot.startSession).toHaveBeenCalledOnce()
    })

    it('should start a session whose topic hides code in chat', async () => {
      const copilot = makeCopilot()
      const tutorial = new Tutorial(
        copilot,
        makeRouter(async () => undefined),
        ref(true)
      )
      await tutorial.startCourse(makeCourse(), makeCourseSeries())
      // The course session starts in the background: the copilot sets itself up silently while
      // the user follows the prelude. Ambient events must not pop the panel either.
      expect(copilot.startSession).toHaveBeenCalledWith(
        expect.objectContaining({ hideCodeInChat: true, autoOpenOnEvents: false }),
        undefined,
        { autoOpen: false }
      )
    })

    it('should keep the panel collapsed when the course declares "copilot": "open"', async () => {
      const copilot = makeCopilot()
      const tutorial = new Tutorial(
        copilot,
        makeRouter(async () => undefined),
        ref(true)
      )
      const course = { ...makeCourse(), prompt: 'Meet the copilot.\n```jsonc\n{ "copilot": "open" }\n```' }
      await tutorial.startCourse(course, makeCourseSeries())
      expect(copilot.startSession).toHaveBeenCalledWith(expect.anything(), undefined, { autoOpen: false })
    })

    it('should defer an open Copilot until an editor-owned opening is complete', async () => {
      const copilot = makeCopilot()
      const tutorial = new Tutorial(
        copilot,
        makeRouter(async () => undefined),
        ref(true)
      )
      const course = {
        ...makeCourse(),
        prompt: [
          'Meet the copilot.',
          '```jsonc',
          '{ "copilot": "open", "opening": [{ "prelude": "Say hello" }] }',
          '```'
        ].join('\n')
      }

      await tutorial.startCourse(course, makeCourseSeries())

      expect(copilot.startSession).toHaveBeenCalledWith(expect.anything(), undefined, { autoOpen: false })
    })
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
