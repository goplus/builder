import { describe, expect, it } from 'vitest'
import { fromText } from './common/file'
import { Stage } from './stage'
import { Backdrop } from './backdrop'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function makeStage() {
  const stage = new Stage('')
  const backdrop = new Backdrop('default', mockFile())
  stage.addBackdrop(backdrop)
  return stage
}

describe('Backdrop', () => {
  it('should clone correctly', () => {
    const stage = makeStage()
    const backdrop = stage.backdrops[0]

    const clone = backdrop.clone()
    expect(clone.id).not.toEqual(backdrop.id)
    expect(clone.name).toEqual(backdrop.name)
    expect(clone.img).toEqual(backdrop.img)
    expect(clone.bitmapResolution).toEqual(backdrop.bitmapResolution)

    stage.addBackdrop(clone)
    expect(clone.stage).toEqual(stage)
  })

  it('should add backdrop after correctly', () => {
    const stage = makeStage()
    const backdrop1 = stage.backdrops[0]

    const backdrop2 = new Backdrop('b2', mockFile())
    stage.addBackdropAfter(backdrop2, backdrop1.id)
    expect(stage.backdrops.map((b) => b.id)).toEqual([backdrop1.id, backdrop2.id])

    const backdrop3 = new Backdrop('b3', mockFile())
    stage.addBackdropAfter(backdrop3, backdrop1.id)
    expect(stage.backdrops.map((b) => b.id)).toEqual([backdrop1.id, backdrop3.id, backdrop2.id])
  })
})
