import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { File } from '@/models/common/file'
import { Costume } from '@/models/spx/costume'
import { CollisionShapeType, Sprite } from '@/models/spx/sprite'
import PivotCollisionEditor from './PivotCollisionEditor.vue'

vi.mock('../../EditorContextProvider.vue', () => ({
  useEditorCtx: () => ({ state: { history: { doAction: async (_: unknown, fn: () => void) => fn() } } })
}))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMessageHandle: (fn: unknown) => ({ fn })
}))
vi.mock('@/utils/img-rendering', () => ({ useRenderableImage: () => [ref(null)] }))
vi.mock('@/utils/dom', () => ({ useContentSize: () => ref({ width: 640, height: 320 }) }))

const shapeStub = (name: string) =>
  defineComponent({
    name,
    props: { config: { type: Object, required: true } },
    setup: () => {
      const node = { nodes: vi.fn(), boundBoxFunc: vi.fn() }
      return { getNode: () => node }
    },
    template: '<div><slot /></div>'
  })

function makeEditor(type: CollisionShapeType, params: number[], collisionEditingEnabled = true) {
  const sprite = new Sprite('Test', '', {
    size: 2,
    heading: 135,
    collisionShapeType: type,
    collisionShapeParams: params
  })
  sprite.addCostume(
    new Costume(
      'body',
      new File('body.png', async () => new ArrayBuffer(0), {
        type: 'image/png',
        meta: { imgSize: { width: 240, height: 200 } }
      }),
      { pivot: { x: 25, y: 18.75 }, bitmapResolution: 4 }
    )
  )
  const wrapper = mount(
    defineComponent({ setup: () => () => h(PivotCollisionEditor, { sprite, collisionEditingEnabled }) }),
    {
      global: {
        plugins: [createI18n({ lang: 'en' })],
        directives: { radar: {} },
        stubs: {
          UIButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
          'v-stage': shapeStub('v-stage'),
          'v-layer': shapeStub('v-layer'),
          'v-circle': shapeStub('v-circle'),
          'v-rect': shapeStub('v-rect'),
          'v-group': shapeStub('v-group'),
          'v-line': shapeStub('v-line'),
          'v-text': shapeStub('v-text'),
          'v-image': shapeStub('v-image'),
          'v-custom-transformer': shapeStub('v-custom-transformer')
        }
      }
    }
  )
  return { sprite, wrapper }
}

describe('PivotCollisionEditor', () => {
  it.each([true, false])('preserves circle parameters on a pivot-only save (collision editing=%s)', async (enabled) => {
    const { sprite, wrapper } = makeEditor(CollisionShapeType.Circle, [10], enabled)
    try {
      await flushPromises()
      const pivot = wrapper.getComponent({ name: 'v-group' })
      pivot.vm.$emit('dragend', { target: { x: () => 30, y: () => 20 } })
      await wrapper.vm.$nextTick()
      await wrapper.get('button:last-child').trigger('click')
      await flushPromises()
      expect(sprite.collisionShapeType).toBe(CollisionShapeType.Circle)
      expect(sprite.collisionShapeParams).toEqual([10])
      expect(sprite.collisionPivot).toEqual({ x: -5, y: 1.25 })
    } finally {
      wrapper.unmount()
      sprite.dispose()
    }
  })

  it('saves an edited circle using its center and one radius', async () => {
    const { sprite, wrapper } = makeEditor(CollisionShapeType.Circle, [10])
    try {
      await flushPromises()
      const circle = wrapper.getComponent({ name: 'v-circle' })
      circle.vm.$emit('transformend', {
        target: {
          x: () => 45,
          y: () => 25,
          width: () => 20,
          height: () => 20,
          scaleX: vi.fn(() => 2),
          scaleY: vi.fn(() => 2)
        }
      })
      await wrapper.vm.$nextTick()
      await wrapper.get('button:last-child').trigger('click')
      await flushPromises()
      expect(sprite.collisionShapeType).toBe(CollisionShapeType.Circle)
      expect(sprite.collisionShapeParams).toEqual([20])
      expect(sprite.collisionPivot).toEqual({ x: 20, y: -6.25 })
    } finally {
      wrapper.unmount()
      sprite.dispose()
    }
  })

  it('edits a capsule and rejects bounds wider than their height', async () => {
    const { sprite, wrapper } = makeEditor(CollisionShapeType.Capsule, [14, 56])
    try {
      await flushPromises()
      const transformer = wrapper.getComponent({ name: 'v-custom-transformer' })
      const constrain = transformer.vm.getNode().boundBoxFunc.mock.calls[0][0]
      const oldBounds = { x: 10, y: 20, width: 28, height: 56, rotation: 0 }
      const validBounds = { ...oldBounds, width: 42, height: 70 }
      expect(constrain(oldBounds, validBounds)).toBe(validBounds)
      expect(constrain(oldBounds, { ...oldBounds, width: 70, height: 42 })).toBe(oldBounds)
      const circleBounds = { ...oldBounds, width: 42, height: 42 }
      expect(constrain(oldBounds, circleBounds)).toBe(circleBounds)
      const capsule = wrapper.getComponent({ name: 'v-rect' })
      expect(capsule.props('config')).toMatchObject({ draggable: true, cornerRadius: 14 })
      capsule.vm.$emit('transformend', {
        target: {
          x: () => 30,
          y: () => 10,
          width: () => 28,
          height: () => 56,
          scaleX: vi.fn(() => 1.5),
          scaleY: vi.fn(() => 1.25)
        }
      })
      await wrapper.vm.$nextTick()
      expect(capsule.props('config').cornerRadius).toBe(21)
      await wrapper.get('button:last-child').trigger('click')
      await flushPromises()
      expect(sprite.collisionShapeType).toBe(CollisionShapeType.Capsule)
      expect(sprite.collisionShapeParams).toEqual([21, 70])
      expect(sprite.collisionPivot).toEqual({ x: 26, y: -26.25 })
    } finally {
      wrapper.unmount()
      sprite.dispose()
    }
  })
})
