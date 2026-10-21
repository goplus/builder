import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import type { CostumeGen, CostumeEditComment } from '@/models/spx/gen/costume-gen'
import CostumeComments from './CostumeComments.vue'

vi.mock('@/utils/dom', () => ({ useContentSize: () => ref({ width: 1000, height: 600 }) }))
vi.mock('@/utils/img-rendering', () => ({
  useRenderableImage: () => [ref({ naturalWidth: 400, naturalHeight: 800 })]
}))

function setup() {
  const gen = reactive({
    image: null,
    editComments: [] as CostumeEditComment[],
    setEditComments(comments: CostumeEditComment[]) {
      this.editComments = comments
    }
  })
  const wrapper = mount(CostumeComments, {
    attachTo: document.body,
    props: { gen: gen as unknown as CostumeGen },
    global: {
      plugins: [createI18n({ lang: 'en' })],
      directives: { radar: () => {} },
      stubs: {
        UIDropdown: defineComponent(
          (_, { slots }) =>
            () =>
              h('div', [slots.trigger?.(), slots.default?.()])
        ),
        UIIcon: true
      }
    }
  })
  onTestFinished(() => wrapper.unmount())
  return { gen, wrapper }
}

describe('CostumeComments', () => {
  it('anchors comments to the contained image and saves, reopens, and deletes them', async () => {
    const { wrapper, gen } = setup()
    const canvas = wrapper.get('button')
    expect(canvas.element.parentElement?.style.cssText).toContain('left: 350px')
    expect(canvas.element.parentElement?.style.cssText).toContain('width: 300px')
    vi.spyOn(canvas.element, 'getBoundingClientRect').mockReturnValue({
      left: 350,
      top: 100,
      width: 300,
      height: 600
    } as DOMRect)
    await canvas.trigger('click', { detail: 1, clientX: 575, clientY: 400 })
    await wrapper.get('textarea').setValue('  Make this white  ')
    await wrapper.get('form').trigger('submit')
    expect(gen.editComments).toEqual([{ id: expect.any(String), x: 0.75, y: 0.5, content: 'Make this white' }])
    await wrapper.get('.comment-marker').trigger('click')
    expect(wrapper.get('.comment-marker').isVisible()).toBe(false)
    expect(wrapper.get('textarea').element.value).toBe('Make this white')
    await wrapper.get('textarea').setValue('Make this blue')
    await wrapper.get('form').trigger('submit')
    expect(gen.editComments).toHaveLength(1)
    expect(gen.editComments[0].content).toBe('Make this blue')
    await wrapper.get('button[title="Delete comment"]').trigger('click')
    await flushPromises()
    expect(gen.editComments).toEqual([])
  })
})
