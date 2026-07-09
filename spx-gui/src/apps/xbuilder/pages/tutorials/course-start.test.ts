import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import CourseStart from './course-start.vue'

const mocks = vi.hoisted(() => {
  const course = {
    id: 'course-1',
    owner: 'curator',
    title: 'Coding Course 1',
    thumbnail: '',
    entrypoint: '/editor/curator/Coding-Course-1/sprites/Kiko/code',
    references: [],
    prompt: 'Help the learner finish the course'
  }
  const courseSeries = {
    id: 'series-1',
    owner: 'curator',
    title: 'Coding Course',
    thumbnail: '',
    description: '',
    courseIDs: ['course-1'],
    order: 1,
    createdAt: '',
    updatedAt: ''
  }
  return {
    course,
    courseSeries,
    getCourse: vi.fn(() => Promise.resolve(course)),
    getCourseSeries: vi.fn(() => Promise.resolve(courseSeries)),
    startCourse: vi.fn(() => Promise.resolve())
  }
})

vi.mock('@/apis/course', () => ({
  getCourse: mocks.getCourse
}))

vi.mock('@/apis/course-series', () => ({
  getCourseSeries: mocks.getCourseSeries
}))

vi.mock('@/components/tutorials/tutorial', () => ({
  useTutorial: () => ({
    startCourse: mocks.startCourse
  })
}))

vi.mock('@/components/tutorials/CourseIntroVideo.vue', () => ({
  default: {
    props: ['src'],
    emits: ['continue'],
    template: '<button data-test-id="intro-continue" @click="$emit(\'continue\')">{{ src }}</button>'
  }
}))

describe('course-start', () => {
  it('waits for the intro video before starting the course', async () => {
    const wrapper = mount(CourseStart, {
      props: {
        courseSeriesIdInput: 'series-1',
        courseIdInput: 'course-1'
      },
      global: {
        mocks: {
          $t: (msg: { en: string }) => msg.en
        }
      }
    })

    await vi.waitFor(() => {
      expect(wrapper.find('[data-test-id="intro-continue"]').exists()).toBe(true)
    })

    expect(mocks.startCourse).not.toHaveBeenCalled()

    await wrapper.get('[data-test-id="intro-continue"]').trigger('click')

    await vi.waitFor(() => {
      expect(mocks.startCourse).toHaveBeenCalledWith(mocks.course, mocks.courseSeries)
    })
  })
})
