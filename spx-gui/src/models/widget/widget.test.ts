import { describe, expect, it } from 'vitest'
import { fromText } from '../common/file'
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

    const clone = widget.clone()
    expect(clone.id).not.toEqual(widget.id)
    expect(clone.name).toEqual(widget.name)
    expect(clone.label).toEqual(widget.label)
    expect(clone.x).toEqual(widget.x)
    expect(clone.y).toEqual(widget.y)
    expect(clone.size).toEqual(widget.size)
    expect(clone.visible).toEqual(widget.visible)

    expect(clone.type).toEqual('monitor')
    expect(clone.variableName).toEqual('variableName1')

    stage.addWidget(clone)
    expect(clone.stage).toEqual(stage)
  })
})
