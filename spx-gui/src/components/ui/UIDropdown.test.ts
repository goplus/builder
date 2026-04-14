import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UIDropdown from './UIDropdown.vue'
import { providePopupStack } from './popup'
import { providePopupContainer } from './utils'

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
  await Promise.resolve()
  await nextTick()
}

const PopupProvider = defineComponent({
  setup(_, { slots }) {
    const popupContainer = ref<HTMLElement>()
    providePopupContainer(popupContainer)
    providePopupStack()

    return () => h('div', [slots.default?.(), h('div', { ref: popupContainer, 'data-test-id': 'popup-container' })])
  }
})

describe('UIDropdown', () => {
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

  it('stays open when clicking the trigger again without emitting clickOutside', async () => {
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
    expect(dropdown.emitted('update:visible')).toEqual([[true]])
    expect(dropdown.emitted('clickOutside')).toBeUndefined()
    expect(popupContainer.text()).toContain('Dropdown content')
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

    await wrapper.get('[data-test-id="parent-content"]').trigger('click')
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

    await popupContainer.get('[data-test-id="child-content"]').trigger('click')
    await flushDropdown()

    expect(childDropdown.emitted('update:visible')).toBeUndefined()
    expect(parentDropdown.emitted('update:visible')).toBeUndefined()
    expect(popupContainer.text()).toContain('Parent content')
    expect(popupContainer.text()).toContain('Child content')
  })
})
