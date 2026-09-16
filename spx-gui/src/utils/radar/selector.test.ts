import { describe, expect, it } from 'vitest'
import { parseRadarSelector, RadarSelectorSyntaxError } from './selector'

describe('parseRadarSelector', () => {
  it('parses JSON-string attribute values', () => {
    expect(parseRadarSelector('api-reference[name="say \\"hi\\" \\\\ now"]')).toEqual([
      {
        name: 'api-reference',
        attrs: { name: 'say "hi" \\ now' }
      }
    ])
  })

  it('rejects malformed JSON-string attribute values', () => {
    expect(() => parseRadarSelector('api-reference[name="\\q"]')).toThrow(RadarSelectorSyntaxError)
    expect(() => parseRadarSelector('api-reference[name="unterminated\\"]')).toThrow(RadarSelectorSyntaxError)
  })
})
