import { describe, expect, it } from 'vitest'

import { getValidName } from './name'

describe('getValidName', () => {
  it('increments numeric suffixes while preserving their width', () => {
    expect(getValidName('video02', (name) => name === 'video03')).toBe('video03')
  })
})
