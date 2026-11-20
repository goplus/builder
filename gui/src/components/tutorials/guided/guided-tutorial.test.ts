import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref, shallowRef } from 'vue'
import type { Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionException } from '@/utils/exception'
import { createReadinessScope } from '@/utils/readiness'
import { useGuidedTutorialStorage } from '../TutorialRoot.vue'
import type { GuidedCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { makeSignedInMock, makeSignedInUser, makeSignedInUserQuery } from '@/stores/user/test'
import { RoundState, type Copilot, type Session, type Topic, type UserMessage } from '@/components/copilot/copilot'
import { EditingMode } from '@/components/editor/editing'
import type { EditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { GuidedTutorial, type GuidedTutorialTopic } from './guided-tutorial'

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
let editorCtx: ReturnType<typeof shallowRef<EditorCtx | undefined>>
let copilot: {
  currentSession: Session | null
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
  editorCtx = shallowRef<EditorCtx | undefined>(undefined)
  copilot = {
    currentSession: null,
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
        const { courseID, seriesID } = useGuidedTutorialStorage()
        tutorial = new GuidedTutorial(
          copilot as unknown as Copilot,
          router as unknown as Router,
          createReadinessScope(),
          courseID,
          seriesID,
          editorCtx
        )
        return () => null
      }
    })
  )
})

describe('Guided Tutorial persistence and identity', () => {
  it.each(['full record', 'id object', 'string'])(
    'restores account storage while user information is loading or failed (format: %s)',
    async (format) => {
      const saved = JSON.stringify({
        __user__: 'alice',
        __value__: format === 'full record' ? course : format === 'id object' ? { id: course.id } : course.id
      })
      sessionStorage.setItem('spx-gui-tutorial-course', saved)
      sessionStorage.setItem(
        'spx-gui-tutorial-series',
        JSON.stringify({ __user__: 'alice', __value__: format === 'string' ? series.id : series })
      )
      expect(tutorial.currentCourse?.id).toBe(course.id)
      auth.error.value = new ActionException(new Error('offline'), { en: 'Failed', zh: '失败' })
      auth.isLoading.value = false
      expect(tutorial.currentCourse?.id).toBe(course.id)
      expect(sessionStorage.getItem('spx-gui-tutorial-course')).toBe(saved)
      auth.error.value = null
      auth.data.value = makeSignedInUser('alice')
      await flushPromises()
      expect(tutorial.currentCourse?.id).toBe(course.id)
    }
  )

  it('starts and persists a course before user information loads', async () => {
    await tutorial.enterCourse(course, series)
    expect(auth.data.value).toBeNull()
    expect(copilot.startSession).toHaveBeenCalledOnce()
    expect(JSON.parse(sessionStorage.getItem('spx-gui-tutorial-course')!)).toEqual({
      __user__: 'alice',
      __value__: course.id
    })
    expect(JSON.parse(sessionStorage.getItem('spx-gui-tutorial-series')!)).toEqual({
      __user__: 'alice',
      __value__: series.id
    })
  })

  it.each(['course', 'series'])('ignores a stored legacy %s record with a non-string ID', (invalidRecord) => {
    sessionStorage.setItem(
      'spx-gui-tutorial-course',
      JSON.stringify({ __user__: 'alice', __value__: { id: invalidRecord === 'course' ? 123 : course.id } })
    )
    sessionStorage.setItem(
      'spx-gui-tutorial-series',
      JSON.stringify({ __user__: 'alice', __value__: { id: invalidRecord === 'series' ? 456 : series.id } })
    )
    expect(tutorial.currentCourse).toBeNull()
  })

  it('clears persisted identities when the course ends', async () => {
    await tutorial.enterCourse(course, series)
    tutorial.endCurrentCourse()
    expect(tutorial.currentCourse).toBeNull()
    expect(sessionStorage.getItem('spx-gui-tutorial-course')).toBeNull()
    expect(sessionStorage.getItem('spx-gui-tutorial-series')).toBeNull()
  })

  it('does not restore another account’s course', async () => {
    await tutorial.enterCourse(course, series)
    username.value = 'bob'
    expect(tutorial.currentCourse).toBeNull()
  })
})

describe('Guided Tutorial initial state', () => {
  const courseTopic: GuidedTutorialTopic = {
    isTutorialTopic: true,
    title: { en: course.title, zh: course.title },
    description: '',
    reactToEvents: true,
    endable: false
  }

  function round(state: RoundState, type: UserMessage['type'] = 'event', event = 'event') {
    const userMessage: UserMessage =
      type === 'text'
        ? { type, role: 'user', content: 'What is next?' }
        : { type, role: 'user', name: { en: event, zh: event }, detail: event }
    return { state, userMessage }
  }

  function setSession(rounds: Array<ReturnType<typeof round>>, topic: Topic = courseTopic, roundsDropped = false) {
    copilot.currentSession = { topic, rounds, roundsDropped } as unknown as Session
  }

  function setEditing(mode: EditingMode, dirty: boolean) {
    editorCtx.value = { state: { editing: { mode, dirty } } } as unknown as EditorCtx
  }

  it('stays initial without a session or while the opening is still loading', () => {
    expect(tutorial.isCurrentCourseInInitialState()).toBe(true)
    setSession([round(RoundState.Cancelled), round(RoundState.InProgress)])
    expect(tutorial.isCurrentCourseInInitialState()).toBe(true)
  })

  it.each([
    ['page navigation', 'course start'],
    ['course start', 'page navigation']
  ])('stays initial when %s is cut off by the %s opening', (cutOff, opening) => {
    setSession([round(RoundState.Cancelled, 'event', cutOff), round(RoundState.Completed, 'event', opening)])
    expect(tutorial.isCurrentCourseInInitialState()).toBe(true)
  })

  it.each([RoundState.Initialized, RoundState.Loading, RoundState.Completed, RoundState.Cancelled])(
    'has progress once a round in state %s follows the opening',
    (state) => {
      setSession([round(RoundState.Cancelled), round(RoundState.Completed), round(state)])
      expect(tutorial.isCurrentCourseInInitialState()).toBe(false)
    }
  )

  it('has progress once the learner sends a text message, even before the opening completes', () => {
    setSession([round(RoundState.Cancelled), round(RoundState.Cancelled), round(RoundState.Loading, 'text')])
    expect(tutorial.isCurrentCourseInInitialState()).toBe(false)
  })

  it('has progress once the session dropped earlier rounds', () => {
    const rounds = [...Array.from({ length: 9 }, () => round(RoundState.Cancelled)), round(RoundState.Completed)]
    setSession(rounds)
    expect(tutorial.isCurrentCourseInInitialState()).toBe(true)
    setSession(rounds, courseTopic, true)
    expect(tutorial.isCurrentCourseInInitialState()).toBe(false)
  })

  it('ignores a Copilot session of another topic', () => {
    setSession([round(RoundState.Completed, 'text'), round(RoundState.Completed, 'text')], {
      title: { en: 'Chat', zh: '聊天' },
      description: '',
      reactToEvents: false
    })
    expect(tutorial.isCurrentCourseInInitialState()).toBe(true)
  })

  it('has progress while the editor has unsaved edits in effect-free mode', () => {
    setSession([round(RoundState.Cancelled), round(RoundState.Completed)])
    setEditing(EditingMode.EffectFree, true)
    expect(tutorial.isCurrentCourseInInitialState()).toBe(false)
    setEditing(EditingMode.EffectFree, false)
    expect(tutorial.isCurrentCourseInInitialState()).toBe(true)
    setEditing(EditingMode.AutoSave, true)
    expect(tutorial.isCurrentCourseInInitialState()).toBe(true)
    copilot.currentSession = null
    setEditing(EditingMode.EffectFree, true)
    expect(tutorial.isCurrentCourseInInitialState()).toBe(false)
  })
})
