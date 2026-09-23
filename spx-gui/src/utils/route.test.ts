import { describe, expect, it } from 'vitest'

import { repeatableParamToPathSegments } from './route'

describe('repeatableParamToPathSegments', () => {
  it('treats an empty repeatable param as no segments', () => {
    expect(repeatableParamToPathSegments('')).toEqual([])
  })

  it('preserves decoded segments without splitting them again', () => {
    expect(repeatableParamToPathSegments('A/B')).toEqual(['A/B'])
    expect(repeatableParamToPathSegments(['sprites', 'A/B', 'code'])).toEqual(['sprites', 'A/B', 'code'])
  })
})
