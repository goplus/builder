import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UIDropdown from './UIDropdown.vue'
import { provideLayerStack, providePopupContainer } from './utils'

const floatingMocks = vi.hoisted(() => {
  return {
    computePosition: vi.fn(),
    autoUpdate: vi.fn()
  }
})

vi.mock('@floating-ui/dom', () => ({
  computePosition: floatingMocks.computePosition,
  autoUpdate: floatingMocks.autoUpdate,
  offset: (value: unknown) => ({ name: 'offset', value }),
  flip: () => ({ name: 'flip' }),
  shift: (value: unknown) => ({ name: 'shift', value }),
  arrow: (value: unknown) => ({ name: 'arrow', value })
}))

async function flushDropdown() {
  await nextTick()
  await vi.advanceTimersByTimeAsync(0)
  await Promise.resolve()
  await nextTick()
}

const PopupProvider = defineComponent({
  setup(_, { slots }) {
    const popupContainer = ref<HTMLElement>()
    providePopupContainer(popupContainer)
    provideLayerStack()

    return () => h('div', [slots.default?.(), h('div', { ref: popupContainer, 'data-test-id': 'popup-container' })])
  }
})

describe('UIDropdown', () => {
  describe('cross-boundary pointer gestures', () => {
    const wrappers: VueWrapper[] = []

    afterEach(() => {
      for (const wrapper of wrappers.splice(0)) wrapper.unmount()
    })

    async function mountGestureDropdown() {
      const wrapper = mount(
        defineComponent({
          setup() {
            const visible = ref(true)
            return () =>
              h(PopupProvider, null, {
                default: () =>
                  h(
                    UIDropdown,
                    {
                      trigger: 'click',
                      visible: visible.value,
                      'onUpdate:visible': (value: boolean) => (visible.value = value)
                    },
                    {
                      trigger: () => h('input', { 'data-test-id': 'trigger', value: 'Trigger text' }),
                      default: () => h('textarea', { 'data-test-id': 'content' }, 'Select dropdown text')
                    }
                  )
              })
          }
        }),
        { attachTo: document.body }
      )
      wrappers.push(wrapper)
      await flushDropdown()
      return {
        dropdown: wrapper.getComponent(UIDropdown),
        trigger: new DOMWrapper(document.querySelector('[data-test-id="trigger"]')!),
        content: new DOMWrapper(document.querySelector('[data-test-id="content"]')!),
        outside: new DOMWrapper(document.body)
      }
    }

    it.each([
      ['content', 'outside'],
      ['outside', 'content'],
      ['trigger', 'outside'],
      ['outside', 'trigger'],
      ['content', 'trigger']
    ] as const)('stays open for a drag from %s to %s, then accepts a fresh outside click', async (start, end) => {
      const elements = await mountGestureDropdown()
      await elements[start].trigger('pointerdown')
      await elements[end].trigger('pointerup')
      // The browser targets the common ancestor when press and release targets differ.
      await elements.outside.trigger('click')
      await flushDropdown()

      expect(elements.dropdown.emitted('clickOutside')).toBeUndefined()
      expect(elements.dropdown.emitted('update:visible')).toBeUndefined()
      expect(document.querySelector('[data-test-id="content"]')).not.toBeNull()

      for (const type of ['pointerdown', 'pointerup', 'click']) await elements.outside.trigger(type)
      await flushDropdown()
      expect(elements.dropdown.emitted('clickOutside')).toHaveLength(1)
      expect(elements.dropdown.emitted('update:visible')).toEqual([[false]])
      expect(document.querySelector('[data-test-id="content"]')).toBeNull()
    })

    it('keeps selection inside open and preserves trigger click toggling', async () => {
      const { dropdown, content, trigger } = await mountGestureDropdown()
      for (const type of ['pointerdown', 'pointerup', 'click']) await content.trigger(type)
      expect(dropdown.emitted('update:visible')).toBeUndefined()
      expect(dropdown.emitted('clickOutside')).toBeUndefined()

      for (const type of ['pointerdown', 'pointerup', 'click']) await trigger.trigger(type)
      expect(dropdown.emitted('update:visible')).toEqual([[false]])
      expect(dropdown.emitted('clickOutside')).toBeUndefined()
    })

    it('ignores a cancelled gesture without preventing the next outside click', async () => {
      const { dropdown, outside } = await mountGestureDropdown()
      for (const type of ['pointerdown', 'pointercancel', 'click']) await outside.trigger(type)
      expect(dropdown.emitted('clickOutside')).toBeUndefined()

      for (const type of ['pointerdown', 'pointerup', 'click']) await outside.trigger(type)
      expect(dropdown.emitted('clickOutside')).toHaveLength(1)
      expect(dropdown.emitted('update:visible')).toEqual([[false]])
    })
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    floatingMocks.computePosition.mockResolvedValue({
      x: 16,
      y: 24,
      strategy: 'fixed',
      placement: 'bottom',
      middlewareData: {
        arrow: {
          x: 4,
          y: 0
        }
      }
    })
    floatingMocks.autoUpdate.mockImplementation((_reference, _floating, update) => {
      void update()
      return vi.fn()
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('exposes positioned only after the popup becomes visible, including reopening', async () => {
    let resolvePosition!: (value: any) => void
    floatingMocks.computePosition.mockImplementation(() => new Promise((resolve) => (resolvePosition = resolve)))
    const visible = ref(true)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(PopupProvider, null, {
            default: () =>
              h(
                UIDropdown,
                {
                  trigger: 'manual',
                  visible: visible.value,
                  pos: { x: 20, y: 20 }
                },
                {
                  default: ({ positioned }: { positioned: boolean }) =>
                    h('div', { 'data-test-id': 'positioned' }, String(positioned))
                }
              )
          })
      }),
      { attachTo: document.body }
    )
    const content = () => document.querySelector('[data-test-id="positioned"]')!
    for (let opening = 0; opening < 2; opening++) {
      await flushDropdown()
      expect(content().textContent).toBe('false')
      expect((content().parentElement as HTMLElement).style.visibility).toBe('hidden')
      resolvePosition({ x: 20, y: 20, strategy: 'fixed', placement: 'bottom', middlewareData: {} })
      await flushDropdown()
      expect(content().textContent).toBe('true')
      expect((content().parentElement as HTMLElement).style.visibility).toBe('visible')
      visible.value = false
      await flushDropdown()
      visible.value = true
    }
    wrapper.unmount()
  })

  it('opens on hover only after the default hover delay', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(
                  UIDropdown,
                  { trigger: 'hover' },
                  {
                    trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Hover me'),
                    default: () => h('div', 'Dropdown content')
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    const dropdown = wrapper.getComponent(UIDropdown)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')

    await wrapper.get('[data-test-id="trigger"]').trigger('mouseenter')
    await flushDropdown()
    expect(popupContainer.text()).not.toContain('Dropdown content')

    await vi.advanceTimersByTimeAsync(99)
    await flushDropdown()
    expect(popupContainer.text()).not.toContain('Dropdown content')

    await vi.advanceTimersByTimeAsync(1)
    await flushDropdown()
    expect(dropdown.emitted('update:visible')).toEqual([[true]])
    expect(popupContainer.text()).toContain('Dropdown content')
  })

  it('cancels a pending hover open when it becomes disabled before the delay elapses', async () => {
    const wrapper = mount(
      defineComponent({
        data() {
          return {
            disabled: false
          }
        },
        render() {
          return h(PopupProvider, null, {
            default: () =>
              h(
                UIDropdown,
                { trigger: 'hover', disabled: this.disabled },
                {
                  trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Hover me'),
                  default: () => h('div', 'Dropdown content')
                }
              )
          })
        }
      }),
      { attachTo: document.body }
    )

    const dropdown = wrapper.getComponent(UIDropdown)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')

    await wrapper.get('[data-test-id="trigger"]').trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(50)
    await wrapper.setData({ disabled: true })
    await vi.advanceTimersByTimeAsync(100)
    await flushDropdown()

    expect(dropdown.emitted('update:visible')).toBeUndefined()
    expect(popupContainer.text()).not.toContain('Dropdown content')
  })

  it('closes when clicking the trigger again without emitting clickOutside', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(
                  UIDropdown,
                  { trigger: 'click' },
                  {
                    trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Open'),
                    default: () => h('div', 'Dropdown content')
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    const dropdown = wrapper.getComponent(UIDropdown)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')

    await wrapper.get('[data-test-id="trigger"]').trigger('click')
    await flushDropdown()
    expect(dropdown.emitted('update:visible')).toEqual([[true]])
    expect(popupContainer.text()).toContain('Dropdown content')

    await wrapper.get('[data-test-id="trigger"]').trigger('click')
    await flushDropdown()
    expect(dropdown.emitted('update:visible')).toEqual([[true], [false]])
    expect(dropdown.emitted('clickOutside')).toBeUndefined()
    expect(popupContainer.text()).not.toContain('Dropdown content')
  })

  it('does not open while disabled', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(
                  UIDropdown,
                  { trigger: 'click', disabled: true },
                  {
                    trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Open'),
                    default: () => h('div', 'Dropdown content')
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    const dropdown = wrapper.getComponent(UIDropdown)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')

    await wrapper.get('[data-test-id="trigger"]').trigger('click')
    await flushDropdown()

    expect(dropdown.emitted('update:visible')).toBeUndefined()
    expect(popupContainer.text()).not.toContain('Dropdown content')
  })

  it('closes and emits clickOutside when clicking outside the dropdown', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(PopupProvider, null, {
              default: () => [
                h(
                  UIDropdown,
                  { trigger: 'click' },
                  {
                    trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Open'),
                    default: () => h('div', 'Dropdown content')
                  }
                ),
                h('button', { 'data-test-id': 'outside' }, 'Outside')
              ]
            })
        }
      }),
      { attachTo: document.body }
    )

    const dropdown = wrapper.getComponent(UIDropdown)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')

    await wrapper.get('[data-test-id="trigger"]').trigger('click')
    await flushDropdown()
    expect(popupContainer.text()).toContain('Dropdown content')

    await wrapper.get('[data-test-id="outside"]').trigger('click')
    await flushDropdown()

    expect(dropdown.emitted('clickOutside')).toHaveLength(1)
    expect(dropdown.emitted('update:visible')).toEqual([[true], [false]])
    expect(popupContainer.text()).not.toContain('Dropdown content')
  })

  it('does not immediately close when manual control opens it on mouseup', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          const visible = ref(false)

          return () =>
            h(PopupProvider, null, {
              default: () => [
                h(
                  UIDropdown,
                  {
                    trigger: 'manual',
                    visible: visible.value,
                    'onUpdate:visible': (nextVisible: boolean) => (visible.value = nextVisible)
                  },
                  {
                    trigger: () => h('button', { 'data-test-id': 'trigger' }, 'Trigger'),
                    default: () => h('div', 'Dropdown content')
                  }
                ),
                h(
                  'button',
                  {
                    'data-test-id': 'opener',
                    onMouseup: () => {
                      visible.value = true
                    }
                  },
                  'Open'
                )
              ]
            })
        }
      }),
      { attachTo: document.body }
    )

    const dropdown = wrapper.getComponent(UIDropdown)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')
    const openerEl = wrapper.get('[data-test-id="opener"]').element

    openerEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    openerEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushDropdown()

    expect(dropdown.emitted('clickOutside')).toBeUndefined()
    expect(dropdown.emitted('update:visible')).toBeUndefined()
    expect(popupContainer.text()).toContain('Dropdown content')
  })

  it('keeps the internal trigger ref working even when the trigger slot node also defines a ref', async () => {
    let userTriggerRef: HTMLElement | null = null

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(
                  UIDropdown,
                  { trigger: 'click' },
                  {
                    trigger: () =>
                      h(
                        'button',
                        {
                          ref: ((el: Element | null) => {
                            userTriggerRef = el instanceof HTMLElement ? el : null
                          }) as any,
                          'data-test-id': 'trigger'
                        },
                        'Open'
                      ),
                    default: () => h('div', 'Dropdown content')
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    const triggerEl = wrapper.get('[data-test-id="trigger"]').element as HTMLElement

    await wrapper.get('[data-test-id="trigger"]').trigger('click')
    await flushDropdown()

    expect(userTriggerRef).toBe(triggerEl)
    expect(floatingMocks.computePosition).toHaveBeenCalled()
    expect(floatingMocks.computePosition.mock.calls[0]?.[0]).toBe(triggerEl)
  })

  it('only closes the topmost nested dropdown on outside click within the parent dropdown', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          const parentVisible = ref(true)
          const childVisible = ref(true)

          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(
                  UIDropdown,
                  {
                    trigger: 'manual',
                    visible: parentVisible.value,
                    'onUpdate:visible': (visible: boolean) => (parentVisible.value = visible)
                  },
                  {
                    trigger: () => h('button', { 'data-test-id': 'parent-trigger' }, 'Parent trigger'),
                    default: () =>
                      h('div', { 'data-test-id': 'parent-content' }, [
                        h('div', 'Parent content'),
                        h(
                          UIDropdown,
                          {
                            trigger: 'manual',
                            visible: childVisible.value,
                            'onUpdate:visible': (visible: boolean) => (childVisible.value = visible)
                          },
                          {
                            trigger: () => h('button', { 'data-test-id': 'child-trigger' }, 'Child trigger'),
                            default: () => h('div', 'Child content')
                          }
                        )
                      ])
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    await flushDropdown()

    const [parentDropdown, childDropdown] = wrapper.findAllComponents(UIDropdown)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')
    expect(parentDropdown).toBeTruthy()
    expect(childDropdown).toBeTruthy()
    expect(popupContainer.text()).toContain('Parent content')
    expect(popupContainer.text()).toContain('Child content')

    for (const type of ['pointerdown', 'pointerup', 'click']) {
      await wrapper.get('[data-test-id="parent-content"]').trigger(type)
    }
    await flushDropdown()

    expect(childDropdown.emitted('update:visible')).toEqual([[false]])
    expect(parentDropdown.emitted('update:visible')).toBeUndefined()
    expect(popupContainer.text()).toContain('Parent content')
    expect(popupContainer.text()).not.toContain('Child content')
  })

  it('keeps the parent dropdown open when clicking inside teleported child dropdown content', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          const parentVisible = ref(true)
          const childVisible = ref(true)

          return () =>
            h(PopupProvider, null, {
              default: () =>
                h(
                  UIDropdown,
                  {
                    trigger: 'manual',
                    visible: parentVisible.value,
                    'onUpdate:visible': (visible: boolean) => (parentVisible.value = visible)
                  },
                  {
                    trigger: () => h('button', { 'data-test-id': 'parent-trigger' }, 'Parent trigger'),
                    default: () =>
                      h('div', { 'data-test-id': 'parent-content' }, [
                        h('div', 'Parent content'),
                        h(
                          UIDropdown,
                          {
                            trigger: 'manual',
                            visible: childVisible.value,
                            'onUpdate:visible': (visible: boolean) => (childVisible.value = visible)
                          },
                          {
                            trigger: () => h('button', { 'data-test-id': 'child-trigger' }, 'Child trigger'),
                            default: () => h('div', { 'data-test-id': 'child-content' }, 'Child content')
                          }
                        )
                      ])
                  }
                )
            })
        }
      }),
      { attachTo: document.body }
    )

    await flushDropdown()

    const [parentDropdown, childDropdown] = wrapper.findAllComponents(UIDropdown)
    const popupContainer = wrapper.get('[data-test-id="popup-container"]')
    expect(parentDropdown).toBeTruthy()
    expect(childDropdown).toBeTruthy()
    expect(popupContainer.text()).toContain('Parent content')
    expect(popupContainer.text()).toContain('Child content')

    for (const type of ['pointerdown', 'pointerup', 'click']) {
      await popupContainer.get('[data-test-id="child-content"]').trigger(type)
    }
    await flushDropdown()

    expect(childDropdown.emitted('update:visible')).toBeUndefined()
    expect(parentDropdown.emitted('update:visible')).toBeUndefined()
    expect(popupContainer.text()).toContain('Parent content')
    expect(popupContainer.text()).toContain('Child content')
  })
})
