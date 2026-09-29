import { describe, expect, it } from 'vitest'
import { fromText } from '../../common/file'
import { Stage } from '../stage'
import { Backdrop } from '../backdrop'
import { Monitor } from './monitor'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function makeStage() {
  const stage = new Stage('')
  const backdrop = new Backdrop('default', mockFile())
  stage.addBackdrop(backdrop)

  const widget = new Monitor('monitor', {
    label: 'label11',
    target: 'MySprite',
    x: 10,
    y: 10,
    visible: true,
    variableName: 'variableName1'
  })
  stage.addWidget(widget)
  return stage
}

describe('Widget', () => {
  it('should clone correctly', () => {
    const stage = makeStage()
    const widget = stage.widgets[0]
    widget.mode = 2
    widget.style = 'scratch'

    const clone = widget.clone()
    expect(clone.id).not.toEqual(widget.id)
    expect(clone.name).toEqual(widget.name)
    expect(clone.label).toEqual(widget.label)
    expect(clone.x).toEqual(widget.x)
    expect(clone.y).toEqual(widget.y)
    expect(clone.size).toEqual(widget.size)
    expect(clone.visible).toEqual(widget.visible)

    expect(clone.type).toEqual('monitor')
    expect(clone.mode).toEqual(2)
    expect(clone.style).toEqual('scratch')
    expect(clone.target).toEqual('MySprite')
    expect(clone.variableName).toEqual('variableName1')

    stage.addWidget(clone)
    expect(clone.stage).toEqual(stage)
  })
})

describe('Monitor.load', () => {
  it.each([
    { mode: 3, sliderMin: -1.5, sliderMax: 20, isDiscrete: true },
    { mode: 3, sliderMin: 0, sliderMax: 0, isDiscrete: false },
    { mode: 4, width: 180, height: 260 },
    { mode: 4, width: 0, height: 0 }
  ])('should preserve monitor configuration %j', (config) => {
    const monitor = Monitor.load({ type: 'monitor', name: 'monitor1', val: 'value', ...config })
    expect(monitor).toMatchObject(config)
    expect(monitor.clone()).toMatchObject(config)
    expect(monitor.clone().export()).toMatchObject(config)
    const exported = JSON.parse(JSON.stringify(monitor.export()))
    expect(exported).toMatchObject(config)
    expect(Monitor.load(exported)).toMatchObject(config)
  })

  it.each([1, 2, 3, 4])('should default missing fields for mode %i', (mode) => {
    const monitor = Monitor.load({ type: 'monitor', name: 'monitor1', val: 'value', mode })
    expect(monitor).toMatchObject({ sliderMin: 0, sliderMax: 100, isDiscrete: true, width: 0, height: 0 })
    const exported = monitor.export()
    if (mode === 3) {
      expect(exported).toMatchObject({ sliderMin: 0, sliderMax: 100, isDiscrete: true })
    } else {
      expect(exported).not.toHaveProperty('sliderMin')
      expect(exported).not.toHaveProperty('sliderMax')
      expect(exported).not.toHaveProperty('isDiscrete')
    }
    if (mode === 4) {
      expect(exported).toMatchObject({ width: 0, height: 0 })
    } else {
      expect(exported).not.toHaveProperty('width')
      expect(exported).not.toHaveProperty('height')
    }
  })

  it('should default target to empty string when not provided', () => {
    const monitor = Monitor.load({
      type: 'monitor',
      name: 'monitor1',
      mode: 1,
      val: 'score',
      label: 'Score'
    })
    expect(monitor.style).toEqual('default')
    expect(monitor.target).toEqual('')
    expect(monitor.variableName).toEqual('score')
    expect(monitor.export().style).toEqual('default')
  })

  it('should load val without legacy prefix', () => {
    const monitor = Monitor.load({
      type: 'monitor',
      name: 'monitor1',
      mode: 1,
      target: 'MySprite',
      val: 'score',
      label: 'Score'
    })
    expect(monitor.target).toEqual('MySprite')
    expect(monitor.variableName).toEqual('score')
  })

  it.each([1, 2, 3, 4])('should load and preserve mode %i', (mode) => {
    const monitor = Monitor.load({
      type: 'monitor',
      name: 'monitor1',
      mode,
      style: 'scratch',
      target: 'MySprite',
      val: 'score',
      label: 'Score'
    })
    expect(monitor.mode).toEqual(mode)
    expect(monitor.style).toEqual('scratch')
    expect(monitor.target).toEqual('MySprite')
    expect(monitor.variableName).toEqual('score')
    expect(monitor.clone().mode).toEqual(mode)
    expect(monitor.export().mode).toEqual(mode)
    expect(Monitor.load(monitor.export()).mode).toEqual(mode)
    expect(monitor.export().style).toEqual('scratch')
  })

  it('should fall back to default style when style is unsupported', () => {
    const monitor = Monitor.load({
      type: 'monitor',
      name: 'monitor1',
      mode: 1,
      style: 'unsupported',
      val: 'score'
    })
    expect(monitor.style).toEqual('default')
    expect(monitor.export().style).toEqual('default')
  })

  it('should load val with legacy getVar: prefix', () => {
    const monitor = Monitor.load({
      type: 'monitor',
      name: 'monitor1',
      mode: 1,
      target: '',
      val: 'getVar:score',
      label: 'Score'
    })
    expect(monitor.target).toEqual('')
    expect(monitor.variableName).toEqual('score')
  })
})
