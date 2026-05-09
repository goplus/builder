import { describe, it, expect } from 'vitest'
import { Animation } from '@/models/spx/animation'
import { Backdrop } from '@/models/spx/backdrop'
import { Costume } from '@/models/spx/costume'
import { Sound } from '@/models/spx/sound'
import { Sprite } from '@/models/spx/sprite'
import { Monitor } from '@/models/spx/widget/monitor'
import { mockFile } from '@/models/common/test'
import { getResourceURI, parseResourceURI, parseResourceContextURI } from './common'

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
    expect(parseResourceURI('spx://resources/sprites/Foo%2FBar/costumes/hello%20world')).toEqual([
      { type: 'sprite', name: 'Foo/Bar' },
      { type: 'costume', name: 'hello world' }
    ])
    expect(parseResourceURI('spx://resources/stage')).toEqual([{ type: 'stage', name: undefined }])
  })
})

describe('parseResourceContextURI', () => {
  it('should parse resource context uri correctly', () => {
    expect(parseResourceContextURI('spx://resources/sprites')).toEqual({ parent: [], type: 'sprite' })
    expect(parseResourceContextURI('spx://resources/sounds')).toEqual({ parent: [], type: 'sound' })
    expect(parseResourceContextURI('spx://resources/widgets')).toEqual({ parent: [], type: 'widget' })
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
    expect(parseResourceContextURI('spx://resources/sprites/Foo%2FBar/costumes')).toEqual({
      parent: [{ type: 'sprite', name: 'Foo/Bar' }],
      type: 'costume'
    })
  })
})

describe('getResourceURI', () => {
  it('should encode resource names in generated uris', () => {
    const sprite = new Sprite('Foo/Bar')
    const sound = new Sound('Boom #1', mockFile())
    const backdrop = new Backdrop('Sky & Sea', mockFile())
    const costume = new Costume('hello world', mockFile())
    sprite.addCostume(costume)
    const animation = new Animation('run/fast')
    sprite.addAnimation(animation)
    const widget = new Monitor('Score #1', {
      x: 10,
      y: 20,
      label: 'Score',
      variableName: 'score'
    })

    expect(getResourceURI(sprite)).toBe('spx://resources/sprites/Foo%2FBar')
    expect(getResourceURI(sound)).toBe('spx://resources/sounds/Boom%20%231')
    expect(getResourceURI(backdrop)).toBe('spx://resources/backdrops/Sky%20%26%20Sea')
    expect(getResourceURI(costume)).toBe('spx://resources/sprites/Foo%2FBar/costumes/hello%20world')
    expect(getResourceURI(animation)).toBe('spx://resources/sprites/Foo%2FBar/animations/run%2Ffast')
    expect(getResourceURI(widget)).toBe('spx://resources/widgets/Score%20%231')
  })
})
