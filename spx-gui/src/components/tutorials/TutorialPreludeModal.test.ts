import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { extractCoursePrelude } from './TutorialPreludeModal.vue'
import TutorialPreludeModal from './TutorialPreludeModal.vue'
import { getOpeningActionMessage } from './tutorial-opening'

describe('getOpeningActionMessage', () => {
  it.each([
    [1, 0, { en: 'Start', zh: '开始' }],
    [2, 0, { en: 'Next', zh: '下一步' }],
    [2, 1, { en: 'Start', zh: '开始' }],
    [3, 0, { en: 'Next', zh: '下一步' }],
    [3, 1, { en: 'Next', zh: '下一步' }],
    [3, 2, { en: 'Start', zh: '开始' }]
  ])('uses the final action only for the last of %i opening windows', (stepCount, stepIndex, expected) => {
    expect(getOpeningActionMessage(stepIndex, stepCount)).toEqual(expected)
  })
})

describe('extractCoursePrelude', () => {
  it('should extract the prelude text from the course prompt', () => {
    const prompt = `Some course description.
<course-prelude>先捡3个香蕉，然后再捡其他4个香蕉。</course-prelude>
More instructions.`
    expect(extractCoursePrelude(prompt)).toBe('先捡3个香蕉，然后再捡其他4个香蕉。')
  })

  it('should keep multi-line prelude text, trimmed', () => {
    const prompt = `<course-prelude>
第一行
第二行
</course-prelude>`
    expect(extractCoursePrelude(prompt)).toBe('第一行\n第二行')
  })

  it('should return null when no prelude section exists or it is empty', () => {
    expect(extractCoursePrelude('A course prompt without prelude')).toBeNull()
    expect(extractCoursePrelude('<course-prelude>  </course-prelude>')).toBeNull()
  })
})

describe('TutorialPreludeModal', () => {
  it('renders the course-start illustration in a fixed two-to-one frame', () => {
    const wrapper = shallowMount(TutorialPreludeModal, {
      props: { visible: true, text: '开始课程。', stepIndex: 0, stepCount: 1 },
      global: {
        directives: { radar: () => undefined },
        stubs: {
          UIModal: { template: '<div><slot /></div>' },
          UIButton: { template: '<button><slot /></button>' },
          MarkdownView: true
        },
        mocks: { $t: (value: { zh: string }) => value.zh }
      }
    })

    const image = wrapper.get('img')
    expect(image.element.parentElement?.classList.contains('aspect-[2/1]')).toBe(true)
    expect(image.attributes('src')).toContain('tutorial-guide-illustration-v3.svg')
    expect(image.classes()).toContain('object-contain')
    expect(wrapper.get('button').text()).toBe('开始')
  })

  it('shows Next before the last window and still emits continue on click', async () => {
    const wrapper = shallowMount(TutorialPreludeModal, {
      props: { visible: true, text: '下一步。', stepIndex: 0, stepCount: 2 },
      global: {
        directives: { radar: () => undefined },
        stubs: {
          UIModal: { template: '<div><slot /></div>' },
          UIButton: { template: '<button><slot /></button>' },
          MarkdownView: true
        },
        mocks: { $t: (value: { zh: string }) => value.zh }
      }
    })

    expect(wrapper.get('button').text()).toBe('下一步')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('continue')).toHaveLength(1)
  })
})
