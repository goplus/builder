import { describe, expect, it } from 'vitest'
import { buildApiReferenceFilter, extractCourseConfig } from './course-config'
import type { APIReferenceItem } from '@/components/xgo-code-editor'

function makeItem(name: string): APIReferenceItem {
  return { definition: { name } } as APIReferenceItem
}

describe('extractCourseConfig', () => {
  it('should return empty config when there is no jsonc block', () => {
    expect(extractCourseConfig('Just a normal prompt, no config here.')).toEqual({ hiddenAreas: [], apis: null })
  })

  it('should parse hide and apis from a jsonc block', () => {
    const prompt = [
      'Course goal.',
      '```jsonc',
      '{',
      '  // hide distractions',
      '  "hide": ["editor-panels", "edit-mode-switch"],',
      '  "apis": ["step", "turn"], // only these',
      '}',
      '```'
    ].join('\n')
    expect(extractCourseConfig(prompt)).toEqual({
      hiddenAreas: ['editor-panels', 'edit-mode-switch'],
      apis: ['step', 'turn']
    })
  })

  it('should distinguish absent apis (show all) from empty apis (hide all)', () => {
    const noApis = '```jsonc\n{ "hide": [] }\n```'
    expect(extractCourseConfig(noApis).apis).toBeNull()

    const emptyApis = '```jsonc\n{ "apis": [] }\n```'
    expect(extractCourseConfig(emptyApis).apis).toEqual([])
  })

  it('should ignore unknown hide areas and non-string entries', () => {
    const prompt = '```jsonc\n{ "hide": ["editor-panels", "no-such-area", 42] }\n```'
    expect(extractCourseConfig(prompt).hiddenAreas).toEqual(['editor-panels'])
  })

  it('should tolerate a malformed block instead of throwing', () => {
    const prompt = '```jsonc\n{ this is not valid json \n```'
    expect(extractCourseConfig(prompt)).toEqual({ hiddenAreas: [], apis: null })
  })

  it('should accept a plain json block too', () => {
    const prompt = '```json\n{ "apis": ["say"] }\n```'
    expect(extractCourseConfig(prompt).apis).toEqual(['say'])
  })
})

describe('buildApiReferenceFilter', () => {
  it('should return null (show all) when apis is null', () => {
    expect(buildApiReferenceFilter(null)).toBeNull()
  })

  it('should match nothing when the whitelist is empty', () => {
    const filter = buildApiReferenceFilter([])!
    expect(filter(makeItem('Sprite.step'))).toBe(false)
  })

  it('should match by method name, ignoring receiver and case', () => {
    const filter = buildApiReferenceFilter(['step', 'turn'])!
    expect(filter(makeItem('Sprite.step'))).toBe(true)
    expect(filter(makeItem('Sprite.turn'))).toBe(true)
    expect(filter(makeItem('Sprite.say'))).toBe(false)
    expect(filter(makeItem('Println'))).toBe(false)
  })
})
