import { describe, expect, it, vi } from 'vitest'
import { createTutorialFramework, type TutorialFrameworkHost } from './tutorial-framework'

// wire 名与请求形状是框架（tools/tutorial）的内部契约：Go 半边按这些名字与字段序列化，
// 这里守住 TS 半边不与之漂移。任何一侧改动都应让本文件先红。
function makeHost(): TutorialFrameworkHost {
  return {
    course: {
      showPrelude: vi.fn(async () => {}),
      showMessage: vi.fn(async () => {}),
      showVideo: vi.fn(async () => {}),
      complete: vi.fn(async () => {}),
      completeWith: vi.fn(async () => {})
    },
    editor: {
      codeEditor: {
        filterAPIs: vi.fn(),
        formatWorkspace: vi.fn(async () => {})
      },
      project: {
        getCode: vi.fn(() => 'stepTo Mushroom'),
        listSprites: vi.fn(() => ['Lita', 'Mushroom'])
      },
      ruler: {
        show: vi.fn(),
        hide: vi.fn()
      }
    },
    copilot: {
      generateText: vi.fn(async () => 'nice work'),
      generateJSON: vi.fn(async () => ({ praise: 'used stepTo' }))
    },
    spotlight: {
      reveal: vi.fn(async () => {})
    }
  }
}

describe('createTutorialFramework', () => {
  it('selects the tutorial framework binding', () => {
    expect(createTutorialFramework(makeHost()).name).toBe('tutorial')
  })

  it('covers exactly the wire names the Go side sends', () => {
    expect(Object.keys(createTutorialFramework(makeHost()).capabilities).sort()).toEqual([
      'copilot_generateJSON',
      'copilot_generateText',
      'course_complete',
      'course_completeWith',
      'course_showMessage',
      'course_showPrelude',
      'course_showVideo',
      'editor_codeEditor_filterAPIs',
      'editor_codeEditor_formatWorkspace',
      'editor_project_getCode',
      'editor_project_listSprites',
      'editor_ruler_hide',
      'editor_ruler_show',
      'spotlight_reveal'
    ])
  })

  it('unpacks each request shape onto the host', async () => {
    const host = makeHost()
    const { capabilities } = createTutorialFramework(host)

    await capabilities.course_showPrelude({ content: 'Move Lita to Mushroom.' })
    expect(host.course.showPrelude).toHaveBeenCalledWith('Move Lita to Mushroom.')

    await capabilities.course_showVideo({ videoName: 'step-to' })
    expect(host.course.showVideo).toHaveBeenCalledWith('step-to')

    await capabilities.course_completeWith({ content: 'Nicely done.' })
    expect(host.course.completeWith).toHaveBeenCalledWith('Nicely done.')

    capabilities.editor_codeEditor_filterAPIs({ apis: ['xgo:github.com/goplus/spx/v3?Sprite.stepTo'] })
    expect(host.editor.codeEditor.filterAPIs).toHaveBeenCalledWith(['xgo:github.com/goplus/spx/v3?Sprite.stepTo'])

    expect(capabilities.editor_project_getCode({ sprite: 'Lita' })).toBe('stepTo Mushroom')
    expect(capabilities.editor_project_listSprites({})).toEqual(['Lita', 'Mushroom'])

    await capabilities.copilot_generateJSON({ content: 'judge this', schema: { type: 'object' } })
    expect(host.copilot.generateJSON).toHaveBeenCalledWith('judge this', { type: 'object' })

    await capabilities.spotlight_reveal({
      target: 'Code editor > Code text editor',
      tip: 'Write here',
      options: { mask: true, duration: 0 }
    })
    expect(host.spotlight.reveal).toHaveBeenCalledWith('Code editor > Code text editor', 'Write here', {
      mask: true,
      duration: 0
    })
  })

  it('passes host results and rejections through untouched', async () => {
    const host = makeHost()
    host.copilot.generateText = vi.fn(async () => 'praise')
    host.course.showMessage = vi.fn(async () => {
      throw new Error('no dialog')
    })
    const { capabilities } = createTutorialFramework(host)

    await expect(capabilities.copilot_generateText({ content: 'say hi' })).resolves.toBe('praise')
    await expect(capabilities.course_showMessage({ content: 'hi' })).rejects.toThrow('no dialog')
  })
})
