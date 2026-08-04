import { describe, expect, it } from 'vitest'
import { sanitizeCompletionComment } from './completion-comment'

describe('sanitizeCompletionComment', () => {
  it('should keep the prose and drop the copilot elements around it', () => {
    expect(sanitizeCompletionComment('<user-progress-ahead/>四个蘑菇已经收集完成。')).toBe('四个蘑菇已经收集完成。')
    expect(sanitizeCompletionComment('做得好！<stay-silent />')).toBe('做得好！')
    expect(sanitizeCompletionComment('<tutorial-course-success comment="x" />Well done.')).toBe('Well done.')
  })

  it('should keep inline Markdown, which is how the dialog names code', () => {
    expect(sanitizeCompletionComment('`repeat` 把动作写在了一个代码块里。')).toBe('`repeat` 把动作写在了一个代码块里。')
    expect(sanitizeCompletionComment('You used **repeat**.')).toBe('You used **repeat**.')
  })

  it('should keep line breaks, since the dialog renders Markdown', () => {
    // Collapsing every run of whitespace (as this once did) flattens a list or a fenced block into
    // one line, and Markdown then renders it as a single paragraph of literal syntax.
    expect(sanitizeCompletionComment('- 收齐了四个\n- 用了 `repeat`')).toBe('- 收齐了四个\n- 用了 `repeat`')
    expect(sanitizeCompletionComment('结果：\n\n```\nrepeat 4\n```')).toBe('结果：\n\n```\nrepeat 4\n```')
  })

  it('should collapse runs of spaces and excess blank lines', () => {
    expect(sanitizeCompletionComment('  Well    done.  ')).toBe('Well done.')
    expect(sanitizeCompletionComment('一句\n\n\n\n另一句')).toBe('一句\n\n另一句')
  })

  it('should return an empty string when nothing but markup is left', () => {
    expect(sanitizeCompletionComment('<stay-silent />')).toBe('')
    expect(sanitizeCompletionComment('   ')).toBe('')
  })
})
