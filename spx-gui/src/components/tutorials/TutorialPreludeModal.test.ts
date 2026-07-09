import { describe, expect, it } from 'vitest'
import { extractCoursePrelude } from './TutorialPreludeModal.vue'

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
