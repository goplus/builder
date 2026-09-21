import { describe, expect, it, vi } from 'vitest'
import { scrollCurrentCourseIntoView } from './tutorial-control-center'

describe('TutorialControlCenter', () => {
  it('centers the current course in the list', () => {
    const scrollIntoView = vi.fn()
    const currentCourse = { scrollIntoView } as unknown as HTMLElement
    const courseList = {
      querySelector: vi.fn().mockReturnValue(currentCourse)
    } as unknown as HTMLElement

    scrollCurrentCourseIntoView(courseList)

    expect(courseList.querySelector).toHaveBeenCalledWith('[aria-current="step"]')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
  })
})
