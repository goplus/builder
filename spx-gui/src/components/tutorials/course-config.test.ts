import { describe, expect, it } from 'vitest'
import { createCourseApiMatcher, extractCourseConfig } from './course-config'

describe('extractCourseConfig', () => {
  it('should return empty config when there is no jsonc block', () => {
    expect(extractCourseConfig('Just a normal prompt, no config here.')).toEqual({
      hiddenAreas: [],
      copilotOpen: false,
      judge: 'code',
      apis: [],
      videos: [],
      complete: null
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
      copilotOpen: false,
      judge: 'code',
      apis: [],
      videos: [],
      complete: null
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

  it('should default judge to code and parse copilot judge', () => {
    expect(extractCourseConfig('```jsonc\n{}\n```').judge).toBe('code')
    expect(extractCourseConfig('```jsonc\n{ "judge": "copilot" }\n```').judge).toBe('copilot')
    expect(extractCourseConfig('```jsonc\n{ "judge": "nonsense" }\n```').judge).toBe('code')
  })

  it('should parse apis and videos as deduped string arrays', () => {
    const prompt = '```jsonc\n{ "apis": ["step", "turn", "step"], "videos": ["step", 42] }\n```'
    const config = extractCourseConfig(prompt)
    expect(config.apis).toEqual(['step', 'turn'])
    expect(config.videos).toEqual(['step'])
  })

  it('should tolerate a malformed block instead of throwing', () => {
    const prompt = '```jsonc\n{ this is not valid json \n```'
    expect(extractCourseConfig(prompt)).toEqual({
      hiddenAreas: [],
      copilotOpen: false,
      judge: 'code',
      apis: [],
      videos: [],
      complete: null
    })
  })

  it('should accept a plain json block too', () => {
    const prompt = '```json\n{ "hide": ["preview-header"] }\n```'
    expect(extractCourseConfig(prompt).hiddenAreas).toEqual(['preview-header'])
  })

  it('should parse the complete signal, defaulting count to 1', () => {
    expect(extractCourseConfig('```jsonc\n{}\n```').complete).toBeNull()
    expect(extractCourseConfig('```jsonc\n{ "complete": { "log": "捡到萝卜" } }\n```').complete).toEqual({
      log: '捡到萝卜',
      count: 1
    })
    expect(extractCourseConfig('```jsonc\n{ "complete": { "log": "捡到萝卜", "count": 4 } }\n```').complete).toEqual({
      log: '捡到萝卜',
      count: 4
    })
    // A completion signal needs a log pattern; count alone (or a blank log) declares nothing.
    expect(extractCourseConfig('```jsonc\n{ "complete": { "count": 4 } }\n```').complete).toBeNull()
    expect(extractCourseConfig('```jsonc\n{ "complete": { "log": " " } }\n```').complete).toBeNull()
    // A non-integer count falls back to 1 instead of poisoning the signal.
    expect(extractCourseConfig('```jsonc\n{ "complete": { "log": "x", "count": 2.5 } }\n```').complete).toEqual({
      log: 'x',
      count: 1
    })
  })

  it('should start with the copilot open only when the course declares it', () => {
    expect(extractCourseConfig('```jsonc\n{ "copilot": "open" }\n```').copilotOpen).toBe(true)
    expect(extractCourseConfig('```jsonc\n{ "hide": ["preview-header"] }\n```').copilotOpen).toBe(false)
    // Anything other than the exact "open" keeps the default hidden start.
    expect(extractCourseConfig('```jsonc\n{ "copilot": "visible" }\n```').copilotOpen).toBe(false)
    expect(extractCourseConfig('```jsonc\n{ "copilot": true }\n```').copilotOpen).toBe(false)
  })
})

describe('createCourseApiMatcher', () => {
  const stepId = 'xgo:github.com/goplus/spx/v2?Sprite.step#0'
  const stepOverloadId = 'xgo:github.com/goplus/spx/v2?Sprite.step#1'
  const gameOnStartId = 'xgo:github.com/goplus/spx/v2?Game.onStart'

  it('should match a bare name against the last segment of the dotted name', () => {
    const matches = createCourseApiMatcher(['step'])
    expect(matches(stepId)).toBe(true)
    expect(matches(stepOverloadId)).toBe(true)
    expect(matches(gameOnStartId)).toBe(false)
  })

  it('should match a dotted name against all of its overloads', () => {
    const matches = createCourseApiMatcher(['Sprite.step'])
    expect(matches(stepId)).toBe(true)
    expect(matches(stepOverloadId)).toBe(true)
    expect(matches(gameOnStartId)).toBe(false)
  })

  it('should match a full definition ID, with and without the overload suffix', () => {
    expect(createCourseApiMatcher(['xgo:github.com/goplus/spx/v2?Sprite.step#0'])(stepId)).toBe(true)
    expect(createCourseApiMatcher(['xgo:github.com/goplus/spx/v2?Sprite.step#0'])(stepOverloadId)).toBe(false)
    const withoutOverload = createCourseApiMatcher(['xgo:github.com/goplus/spx/v2?Sprite.step'])
    expect(withoutOverload(stepId)).toBe(true)
    expect(withoutOverload(stepOverloadId)).toBe(true)
    expect(withoutOverload(gameOnStartId)).toBe(false)
  })

  it('should match when any entry of the set matches', () => {
    const matches = createCourseApiMatcher(['onStart', 'Sprite.step'])
    expect(matches(stepId)).toBe(true)
    expect(matches(gameOnStartId)).toBe(true)
    expect(matches('xgo:github.com/goplus/spx/v2?Sprite.turn#0')).toBe(false)
  })

  it('should match nothing for an empty set', () => {
    expect(createCourseApiMatcher([])(stepId)).toBe(false)
  })
})
