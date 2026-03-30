import { describe, expect, it } from 'vitest'
import { getCallbackReturnTo } from './callback-utils'

describe('getCallbackReturnTo', () => {
  it('returns a normalized internal return target', () => {
    expect(getCallbackReturnTo('?returnTo=%2Fproject%2Falice%2Fdemo')).toBe('/project/alice/demo')
  })

  it('falls back to / for unsafe return targets', () => {
    expect(getCallbackReturnTo('?returnTo=https%3A%2F%2Fevil.example')).toBe('/')
  })

  it('falls back to / when returnTo is missing', () => {
    expect(getCallbackReturnTo('')).toBe('/')
  })
})
