import { describe, it, expect } from 'vitest'
import { Stage } from './stage'
import { Monitor } from './widget/monitor'
import { nextTick } from 'vue'

describe('Stage', () => {
  it('should work well with widgets', () => {
    const stage = new Stage()
    expect(stage.widgets.length).toBe(0)
    const monitor1 = new Monitor('monitor', {
      label: 'label1',
      variableName: 'value1',
      x: 10,
      y: 20,
      size: 2,
      visible: true
    })
    stage.addWidget(monitor1)
    expect(stage.widgets.length).toBe(1)
    expect(stage.widgets[0].name).toBe('monitor')
    expect(stage.widgets[0].label).toBe('label1')
    expect(stage.widgets[0].variableName).toBe('value1')
    expect(stage.widgets[0].x).toBe(10)
    expect(stage.widgets[0].y).toBe(20)
    expect(stage.widgets[0].size).toBe(2)
    expect(stage.widgets[0].visible).toBe(true)

    const monitor2 = new Monitor('monitor', {
      label: 'label2',
      variableName: 'value2',
      x: 0,
      y: 0,
      size: 1,
      visible: false
    })
    stage.addWidget(monitor2)
    expect(stage.widgets.length).toBe(2)
    expect(stage.widgets[1].name).toBe('monitor2')
    expect(stage.widgets[1].label).toBe('label2')
    expect(stage.widgets[1].variableName).toBe('value2')
    expect(stage.widgets[1].x).toBe(0)
    expect(stage.widgets[1].y).toBe(0)
    expect(stage.widgets[1].size).toBe(1)
    expect(stage.widgets[1].visible).toBe(false)

    const [stageConfig] = stage.export()
    expect(stageConfig.widgets!.length).toBe(2)
    expect(stageConfig.widgets![0]).toEqual({
      type: 'monitor',
      name: 'monitor',
      mode: 1,
      target: '',
      color: 15629590,
      label: 'label1',
      val: 'getVar:value1',
      x: 10,
      y: 20,
      size: 2,
      visible: true
    })
    expect(stageConfig.widgets![1]).toEqual({
      type: 'monitor',
      name: 'monitor2',
      mode: 1,
      target: '',
      color: 15629590,
      label: 'label2',
      val: 'getVar:value2',
      x: 0,
      y: 0,
      size: 1,
      visible: false
    })
  })

  it('should work well with zorder', async () => {
    const stage = new Stage()
    const monitor1 = new Monitor('monitor', {
      label: 'label1',
      variableName: 'value1',
      x: 10,
      y: 20,
      size: 2,
      visible: true
    })
    stage.addWidget(monitor1)
    const monitor2 = new Monitor('monitor2', {
      label: 'label2',
      variableName: 'value2',
      x: 0,
      y: 0,
      size: 1,
      visible: false
    })
    stage.addWidget(monitor2)
    stage.upWidgetZorder('monitor')
    expect(stage.widgetsZorder).toEqual(['monitor2', 'monitor'])
    stage.upWidgetZorder('monitor')
    expect(stage.widgetsZorder).toEqual(['monitor2', 'monitor'])
    stage.downWidgetZorder('monitor')
    expect(stage.widgetsZorder).toEqual(['monitor', 'monitor2'])
    stage.topWidgetZorder('monitor')
    expect(stage.widgetsZorder).toEqual(['monitor2', 'monitor'])
    stage.bottomWidgetZorder('monitor')
    expect(stage.widgetsZorder).toEqual(['monitor', 'monitor2'])
    stage.bottomWidgetZorder('monitor2')
    expect(stage.widgetsZorder).toEqual(['monitor2', 'monitor'])

    const [stageConfig] = stage.export()
    expect(stageConfig.widgets!.length).toBe(2)
    expect(stageConfig.widgets![0].name).toBe('monitor2')
    expect(stageConfig.widgets![1].name).toBe('monitor')

    monitor1.setName('monitor1')
    await nextTick()
    expect(stage.widgetsZorder).toEqual(['monitor2', 'monitor1'])

    stage.removeWidget('monitor2')
    expect(stage.widgets.length).toBe(1)
    expect(stage.widgets[0].name).toBe('monitor1')
    expect(stage.widgetsZorder).toEqual(['monitor1'])
  })

  it('should work well with load', async () => {
    const stage = await Stage.load(
      {
        widgets: [
          {
            type: 'monitor',
            name: 'monitor',
            mode: 1,
            target: '',
            color: 15629590,
            label: 'label1',
            val: 'getVar:value1',
            x: 10,
            y: 20,
            size: 2,
            visible: true
          },
          {
            type: 'monitor',
            name: 'monitor2',
            mode: 1,
            target: '',
            color: 15629590,
            label: 'label2',
            val: 'getVar:value2',
            x: 0,
            y: 0,
            size: 1,
            visible: false
          }
        ]
      },
      {}
    )
    expect(stage.widgets.length).toBe(2)
    expect(stage.widgets[0].name).toBe('monitor')
    expect(stage.widgets[0].label).toBe('label1')
    expect(stage.widgets[0].variableName).toBe('value1')
    expect(stage.widgets[0].x).toBe(10)
    expect(stage.widgets[0].y).toBe(20)
    expect(stage.widgets[0].size).toBe(2)
    expect(stage.widgets[0].visible).toBe(true)
    expect(stage.widgets[1].name).toBe('monitor2')

    const [stageConfig] = stage.export()
    expect(stageConfig.widgets!.length).toBe(2)
    expect(stageConfig.widgets![0]).toEqual({
      type: 'monitor',
      name: 'monitor',
      mode: 1,
      target: '',
      color: 15629590,
      label: 'label1',
      val: 'getVar:value1',
      x: 10,
      y: 20,
      size: 2,
      visible: true
    })
    expect(stageConfig.widgets![1]).toEqual({
      type: 'monitor',
      name: 'monitor2',
      mode: 1,
      target: '',
      color: 15629590,
      label: 'label2',
      val: 'getVar:value2',
      x: 0,
      y: 0,
      size: 1,
      visible: false
    })
  })
})
