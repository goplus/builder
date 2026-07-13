import { describe, expect, it } from 'vitest'
import { extractCourseConfig } from './course-config'

describe('extractCourseConfig', () => {
  it('should return empty config when there is no jsonc block', () => {
    expect(extractCourseConfig('Just a normal prompt, no config here.')).toEqual({ hiddenAreas: [] })
  })

  it('should parse hide from a jsonc block', () => {
    const prompt = [
      'Course goal.',
      '```jsonc',
      '{',
      '  // hide distractions',
      '  "hide": ["editor-panels", "edit-mode-switch"],',
      '}',
      '```'
    ].join('\n')
    expect(extractCourseConfig(prompt)).toEqual({ hiddenAreas: ['editor-panels', 'edit-mode-switch'] })
  })

  it('should hide nothing when hide is absent', () => {
    expect(extractCourseConfig('```jsonc\n{}\n```').hiddenAreas).toEqual([])
  })

  it('should ignore unknown hide areas and non-string entries', () => {
    const prompt = '```jsonc\n{ "hide": ["editor-panels", "no-such-area", 42] }\n```'
    expect(extractCourseConfig(prompt).hiddenAreas).toEqual(['editor-panels'])
  })

  it('should dedupe repeated areas', () => {
    const prompt = '```jsonc\n{ "hide": ["editor-panels", "editor-panels"] }\n```'
    expect(extractCourseConfig(prompt).hiddenAreas).toEqual(['editor-panels'])
  })

  it('should tolerate a malformed block instead of throwing', () => {
    const prompt = '```jsonc\n{ this is not valid json \n```'
    expect(extractCourseConfig(prompt)).toEqual({ hiddenAreas: [] })
  })

  it('should accept a plain json block too', () => {
    const prompt = '```json\n{ "hide": ["preview-header"] }\n```'
    expect(extractCourseConfig(prompt).hiddenAreas).toEqual(['preview-header'])
  })
})
