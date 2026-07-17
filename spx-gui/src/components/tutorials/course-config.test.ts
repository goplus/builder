import { describe, expect, it } from 'vitest'
import { extractCourseConfig } from './course-config'

describe('extractCourseConfig', () => {
  it('should return empty config when there is no jsonc block', () => {
    expect(extractCourseConfig('Just a normal prompt, no config here.')).toEqual({
      hiddenAreas: [],
      copilotOpen: false
    })
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
    expect(extractCourseConfig(prompt)).toEqual({
      hiddenAreas: ['editor-panels', 'edit-mode-switch'],
      copilotOpen: false
    })
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
    expect(extractCourseConfig(prompt)).toEqual({ hiddenAreas: [], copilotOpen: false })
  })

  it('should accept a plain json block too', () => {
    const prompt = '```json\n{ "hide": ["preview-header"] }\n```'
    expect(extractCourseConfig(prompt).hiddenAreas).toEqual(['preview-header'])
  })

  it('should start with the copilot open only when the course declares it', () => {
    expect(extractCourseConfig('```jsonc\n{ "copilot": "open" }\n```').copilotOpen).toBe(true)
    expect(extractCourseConfig('```jsonc\n{ "hide": ["preview-header"] }\n```').copilotOpen).toBe(false)
    // Anything other than the exact "open" keeps the default hidden start.
    expect(extractCourseConfig('```jsonc\n{ "copilot": "visible" }\n```').copilotOpen).toBe(false)
    expect(extractCourseConfig('```jsonc\n{ "copilot": true }\n```').copilotOpen).toBe(false)
  })
})
