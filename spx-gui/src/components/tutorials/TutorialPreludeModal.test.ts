import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { extractCoursePrelude } from './TutorialPreludeModal.vue'
import TutorialPreludeModal from './TutorialPreludeModal.vue'

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
      props: { visible: true, text: '开始课程。' },
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
  })
})
