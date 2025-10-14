import { nextTick } from 'vue'
import { describe, it, expect } from 'vitest'
import { Stage } from './stage'
import { Monitor } from './widget/monitor'
import { Backdrop } from './backdrop'
import { File } from './common/file'

function makeBackdrop(name: string) {
  return new Backdrop(name, new File(`${name}.png`, async () => new ArrayBuffer(0)))
}

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
      builder_id: monitor1.id,
      type: 'monitor',
      name: 'monitor',
      mode: 1,
      target: '',
      label: 'label1',
      val: 'getVar:value1',
      x: 10,
      y: 20,
      size: 2,
      visible: true
    })
    expect(stageConfig.widgets![1]).toEqual({
      builder_id: monitor2.id,
      type: 'monitor',
      name: 'monitor2',
      mode: 1,
      target: '',
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
    const monitor = new Monitor('monitor', {
      label: 'label1',
      variableName: 'value1',
      x: 10,
      y: 20,
      size: 2,
      visible: true
    })
    stage.addWidget(monitor)
    const monitor2 = new Monitor('monitor2', {
      label: 'label2',
      variableName: 'value2',
      x: 0,
      y: 0,
      size: 1,
      visible: false
    })
    stage.addWidget(monitor2)
    stage.upWidgetZorder(monitor.id)
    expect(stage.widgetsZorder).toEqual([monitor2.id, monitor.id])
    stage.upWidgetZorder(monitor.id)
    expect(stage.widgetsZorder).toEqual([monitor2.id, monitor.id])
    stage.downWidgetZorder(monitor.id)
    expect(stage.widgetsZorder).toEqual([monitor.id, monitor2.id])
    stage.topWidgetZorder(monitor.id)
    expect(stage.widgetsZorder).toEqual([monitor2.id, monitor.id])
    stage.bottomWidgetZorder(monitor.id)
    expect(stage.widgetsZorder).toEqual([monitor.id, monitor2.id])
    stage.bottomWidgetZorder(monitor2.id)
    expect(stage.widgetsZorder).toEqual([monitor2.id, monitor.id])

    const [stageConfig] = stage.export()
    expect(stageConfig.widgets!.length).toBe(2)
    expect(stageConfig.widgets![0].builder_id).toBe(monitor2.id)
    expect(stageConfig.widgets![1].builder_id).toBe(monitor.id)

    monitor.setName('monitor1')
    await nextTick()
    expect(stage.widgetsZorder).toEqual([monitor2.id, monitor.id])

    stage.removeWidget(monitor2.id)
    expect(stage.widgets.length).toBe(1)
    expect(stage.widgets[0].name).toBe('monitor1')
    expect(stage.widgetsZorder).toEqual([monitor.id])
  })

  it('should work well with load', async () => {
    const stage = await Stage.load(
      {
        widgets: [
          {
            builder_id: 'monitor#1111',
            type: 'monitor',
            name: 'monitor',
            mode: 1,
            target: '',
            label: 'label1',
            val: 'getVar:value1',
            x: 10,
            y: 20,
            size: 2,
            visible: true
          },
          {
            builder_id: 'monitor#2222',
            type: 'monitor',
            name: 'monitor2',
            mode: 1,
            target: '',
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
      builder_id: 'monitor#1111',
      type: 'monitor',
      name: 'monitor',
      mode: 1,
      target: '',
      label: 'label1',
      val: 'getVar:value1',
      x: 10,
      y: 20,
      size: 2,
      visible: true
    })
    expect(stageConfig.widgets![1]).toEqual({
      builder_id: 'monitor#2222',
      type: 'monitor',
      name: 'monitor2',
      mode: 1,
      target: '',
      label: 'label2',
      val: 'getVar:value2',
      x: 0,
      y: 0,
      size: 1,
      visible: false
    })
  })

  it('should move backdrops correctly', async () => {
    const stage = new Stage()
    const backdrop1 = makeBackdrop('backdrop1')
    const backdrop2 = makeBackdrop('backdrop2')
    const backdrop3 = makeBackdrop('backdrop3')
    stage.addBackdrop(backdrop1)
    stage.addBackdrop(backdrop2)
    stage.addBackdrop(backdrop3)
    expect(stage.defaultBackdrop?.name).toEqual('backdrop1')
    stage.moveBackdrop(0, 1)
    expect(stage.backdrops.map((b) => b.name)).toEqual(['backdrop2', 'backdrop1', 'backdrop3'])
    expect(stage.defaultBackdrop?.name).toEqual('backdrop1')
    expect(backdrop1.stage).toEqual(stage)

    stage.moveBackdrop(1, 2)
    expect(stage.backdrops.map((b) => b.name)).toEqual(['backdrop2', 'backdrop3', 'backdrop1'])
    expect(stage.defaultBackdrop?.name).toEqual('backdrop1')

    stage.moveBackdrop(2, 0)
    expect(stage.backdrops.map((b) => b.name)).toEqual(['backdrop1', 'backdrop2', 'backdrop3'])
    expect(stage.defaultBackdrop?.name).toEqual('backdrop1')

    stage.moveBackdrop(2, 1)
    expect(stage.backdrops.map((b) => b.name)).toEqual(['backdrop1', 'backdrop3', 'backdrop2'])
    expect(stage.defaultBackdrop?.name).toEqual('backdrop1')

    stage.moveBackdrop(1, 1)
    expect(stage.backdrops.map((b) => b.name)).toEqual(['backdrop1', 'backdrop3', 'backdrop2'])
    expect(stage.defaultBackdrop?.name).toEqual('backdrop1')

    // invalid index causes error:
    expect(() => stage.moveBackdrop(2, 3)).toThrow()
    expect(() => stage.moveBackdrop(-1, 1)).toThrow()
  })
  it('should move widgets correctly', async () => {
    const stage = new Stage()
    const monitor1 = new Monitor('monitor1', {})
    const monitor2 = new Monitor('monitor2', {})
    const monitor3 = new Monitor('monitor3', {})
    stage.addWidget(monitor1)
    stage.addWidget(monitor2)
    stage.addWidget(monitor3)
    expect(stage.widgetsZorder).toEqual([monitor1.id, monitor2.id, monitor3.id])
    expect(stage.widgets.map((w) => w.name)).toEqual(['monitor1', 'monitor2', 'monitor3'])
    stage.moveWidget(0, 1)
    expect(stage.widgets.map((w) => w.name)).toEqual(['monitor2', 'monitor1', 'monitor3'])
    expect(stage.widgetsZorder).toEqual([monitor1.id, monitor2.id, monitor3.id])
    expect(monitor1.stage).toEqual(stage)

    stage.moveWidget(2, 0)
    expect(stage.widgets.map((w) => w.name)).toEqual(['monitor3', 'monitor2', 'monitor1'])
    expect(stage.widgetsZorder).toEqual([monitor1.id, monitor2.id, monitor3.id])

    // invalid index causes error:
    expect(() => stage.moveWidget(2, 3)).toThrow()
    expect(() => stage.moveWidget(-1, 1)).toThrow()
  })

  it('should add backdrop after correctly', () => {
    const stage = new Stage()
    const backdrop1 = makeBackdrop('b1')
    stage.addBackdrop(backdrop1)

    const backdrop2 = makeBackdrop('b2')
    stage.addBackdropAfter(backdrop2, backdrop1.id)
    expect(stage.backdrops.map((b) => b.id)).toEqual([backdrop1.id, backdrop2.id])

    const backdrop3 = makeBackdrop('b3')
    stage.addBackdropAfter(backdrop3, backdrop1.id)
    expect(stage.backdrops.map((b) => b.id)).toEqual([backdrop1.id, backdrop3.id, backdrop2.id])
  })

  it('should set default backdrop to be correctly after call addBackdropAfter', () => {
    const stage = new Stage()
    const backdrop1 = makeBackdrop('b1')
    stage.addBackdrop(backdrop1)

    stage.setDefaultBackdrop(backdrop1.id)
    expect(stage.defaultBackdrop).toBe(backdrop1)

    const backdrop2 = makeBackdrop('b2')
    // ['b1', 'b2'], default is b1
    stage.addBackdropAfter(backdrop2, backdrop1.id)
    expect(stage.defaultBackdrop).toBe(backdrop1)

    // set default to b2
    stage.setDefaultBackdrop(backdrop2.id)

    const backdrop3 = makeBackdrop('b3')
    // ['b1', 'b3', 'b2'], default is b2
    stage.addBackdropAfter(backdrop3, backdrop1.id)
    const backdrop4 = makeBackdrop('b4')
    // ['b1', 'b3', 'b2', 'b4']
    stage.addBackdropAfter(backdrop4, backdrop2.id)

    expect(stage.defaultBackdrop).toBe(backdrop2)
  })

  it('should add widget after correctly', () => {
    const stage = new Stage()
    const widget1 = new Monitor('monitor1', {
      label: 'label1',
      x: 10,
      y: 10,
      visible: true,
      variableName: 'variableName1'
    })
    stage.addWidget(widget1)

    const widget2 = new Monitor('monitor2', {
      label: 'label2',
      x: 20,
      y: 20,
      visible: true,
      variableName: 'variableName2'
    })
    stage.addWidgetAfter(widget2, widget1.id)
    expect(stage.widgets.map((w) => w.id)).toEqual([widget1.id, widget2.id])

    const widget3 = new Monitor('monitor3', {
      label: 'label3',
      x: 30,
      y: 30,
      visible: true,
      variableName: 'variableName3'
    })
    stage.addWidgetAfter(widget3, widget1.id)
    expect(stage.widgets.map((w) => w.id)).toEqual([widget1.id, widget3.id, widget2.id])
  })
})
