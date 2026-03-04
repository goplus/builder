import { describe, it, expect } from 'vitest'
import { parseResourceURI, parseResourceContextURI } from './common'

describe('parseResourceURI', () => {
  it('should parse resource uri correctly', () => {
    expect(parseResourceURI('spx://resources/sprites/Foo')).toEqual([{ type: 'sprite', name: 'Foo' }])
    expect(parseResourceURI('spx://resources/sprites/Foo/animations/Bar')).toEqual([
      { type: 'sprite', name: 'Foo' },
      { type: 'animation', name: 'Bar' }
    ])
    expect(parseResourceURI('spx://resources/sprites/Foo/costumes/bar_baz')).toEqual([
      { type: 'sprite', name: 'Foo' },
      { type: 'costume', name: 'bar_baz' }
    ])
    expect(parseResourceURI('spx://resources/sounds/Bar')).toEqual([{ type: 'sound', name: 'Bar' }])
    expect(parseResourceURI('spx://resources/backdrops/space')).toEqual([{ type: 'backdrop', name: 'space' }])
    expect(parseResourceURI('spx://resources/widgets/%E5%88%86%E6%95%B0')).toEqual([{ type: 'widget', name: '分数' }])
    expect(parseResourceURI('spx://resources/stage')).toEqual([{ type: 'stage', name: undefined }])
  })
})

describe('parseResourceContextURI', () => {
  it('should parse resource context uri correctly', () => {
    expect(parseResourceContextURI('spx://resources/sprites')).toEqual({ parent: [], type: 'sprite' })
    expect(parseResourceContextURI('spx://resources/sounds')).toEqual({ parent: [], type: 'sound' })
    expect(parseResourceContextURI('spx://resources/sprites/Foo/costumes')).toEqual({
      parent: [{ type: 'sprite', name: 'Foo' }],
      type: 'costume'
    })
    expect(parseResourceContextURI('spx://resources/sprites/Foo/animations')).toEqual({
      parent: [{ type: 'sprite', name: 'Foo' }],
      type: 'animation'
    })
    expect(parseResourceContextURI('spx://resources/sprites/Foo/animations/bar/costumes')).toEqual({
      parent: [
        { type: 'sprite', name: 'Foo' },
        { type: 'animation', name: 'bar' }
      ],
      type: 'costume'
    })
  })
})
