import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UIDropdown, UITextInput } from '@/components/ui'
import { DefinitionKind, makeBasicMarkdownString } from '../../common'
import type { APIReferenceController } from '.'
import APIReferenceUI from './APIReferenceUI.vue'

vi.mock('@/utils/route-loading', () => ({ useRegisterUpdateRouteLoaded: () => undefined }))

const wrappers: Array<ReturnType<typeof mount>> = []

function mountReference() {
  const controller = {
    items: [
      {
        categories: [['event', 'game']],
        definition: { name: 'onStart' },
        kind: DefinitionKind.Listen,
        insertSnippet: 'onStart => {}',
        overview: 'onStart => {}',
        detail: makeBasicMarkdownString({ en: 'When game starts', zh: '游戏开始时执行' })
      },
      {
        categories: [['game', 'others']],
        definition: { name: 'println' },
        kind: DefinitionKind.Command,
        insertSnippet: 'println "hi"',
        overview: 'println msg',
        detail: makeBasicMarkdownString({ en: 'Print a message', zh: '打印消息' })
      }
    ],
    categoryViewInfos: [
      {
        id: 'event',
        label: { en: 'Event', zh: '事件' },
        icon: '',
        subCategories: [{ id: 'game', label: { en: 'Game Events', zh: '游戏事件' } }]
      },
      {
        id: 'game',
        label: { en: 'Game', zh: '游戏' },
        icon: '',
        subCategories: [{ id: 'others', label: { en: 'Others', zh: '其他' } }]
      }
    ],
    error: null
  } as unknown as APIReferenceController
  const wrapper = mount(APIReferenceUI, {
    attachTo: document.body,
    props: { controller },
    global: {
      mocks: { $t: (message: { zh: string }) => message.zh },
      directives: { radar: (el, { value }) => el.setAttribute('aria-label', value.name) },
      stubs: {
        APIReferenceItemComp: { props: ['item'], template: '<li>{{ item.overview }}</li>' },
        UITooltip: { props: ['disabled'], template: '<slot name="trigger" />' },
        UIDropdown: { props: ['visible'], template: '<div><slot name="trigger" /><slot v-if="visible" /></div>' },
        UIIcon: true
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('API Reference search disclosure', () => {
  beforeEach(() => {
    vi.stubGlobal('scheduler', { postTask: async (callback: () => unknown) => callback() })
  })

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.unstubAllGlobals()
  })

  it('starts collapsed and opens an empty, focused search field beside the persistent toggle', async () => {
    const wrapper = mountReference()
    const toggle = wrapper.get('button[aria-expanded]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('input').exists()).toBe(false)
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(wrapper.get('input').element)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.findAll('h5').every((heading) => heading.isVisible())).toBe(true)
  })

  it.each(['toggle', 'Escape'])('clears and collapses through %s, returning focus to the toggle', async (action) => {
    const wrapper = mountReference()
    const toggle = wrapper.get('button[aria-expanded]')
    await toggle.trigger('click')
    await wrapper.get('input').setValue('开始')
    expect(wrapper.get('[role="status"]').text()).toBe('找到 1 种写法')
    if (action === 'toggle') await toggle.trigger('click')
    else await wrapper.get('input').trigger('keydown', { key: 'Escape' })
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('input').exists()).toBe(false)
    expect(document.activeElement).toBe(toggle.element)
    expect(wrapper.findAll('h5').every((heading) => heading.isVisible())).toBe(true)
    await toggle.trigger('click')
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('')
  })

  it('keeps the field expanded when clearing its text or cancelling IME composition', async () => {
    const wrapper = mountReference()
    await wrapper.get('button[aria-expanded]').trigger('click')
    await wrapper.get('input').setValue('开始')
    await wrapper.get('input').trigger('keydown', { key: 'Escape', isComposing: true })
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('开始')
    await wrapper.getComponent(UITextInput).get('button').trigger('click')
    expect(wrapper.get('button[aria-expanded]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('')
    expect(document.activeElement).toBe(wrapper.get('input').element)
    expect(wrapper.findAll('h5').every((heading) => heading.isVisible())).toBe(true)
  })

  it('shows one hint for empty results and restores the count when matches return', async () => {
    const wrapper = mountReference()
    await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
    await wrapper.get('input').setValue('没有这个功能')
    const statusElement = wrapper.get('[role="status"]').element
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toBe('没有找到匹配的 API，试试其他名称或功能词。')
    expect(wrapper.text()).not.toContain('找到 0 种写法')
    await wrapper.get('input').setValue('开始')
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toBe('找到 1 种写法')
    expect(wrapper.get('[role="status"]').element).toBe(statusElement)
    expect(wrapper.text()).not.toContain('没有找到匹配的 API')
  })

  it('opens category names from the header instead of displaying the category row inline', async () => {
    const wrapper = mountReference()
    const toggle = wrapper.get('[aria-label="API categories"]')
    expect(wrapper.find('[aria-label="API category list"]').exists()).toBe(false)
    await toggle.trigger('click')
    await flushPromises()
    expect(wrapper.get('[aria-label="API category list"]').text()).toBe('事件 游戏')
    expect(document.activeElement).toBe(wrapper.get('button[aria-pressed="true"]').element)
    await toggle.trigger('click')
    expect(wrapper.find('[aria-label="API category list"]').exists()).toBe(false)
  })

  it('returns from search to the chosen category, closes the popup and restores trigger focus', async () => {
    const wrapper = mountReference()
    const list = wrapper.get('[data-category-id="game"]').element.parentElement!
    list.scrollTo = vi.fn()
    await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
    await wrapper.get('input').setValue('开始')
    await wrapper.get('[aria-label="API categories"]').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="游戏"]').trigger('click')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(list.scrollTo).toHaveBeenCalledOnce()
    expect(wrapper.find('[aria-label="API category list"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[aria-label="API categories"]').element)
  })

  it('restores popup focus on dismissal without stealing focus from another control', async () => {
    const wrapper = mountReference()
    const toggle = wrapper.get('[aria-label="API categories"]')
    await toggle.trigger('click')
    await flushPromises()
    wrapper.getComponent(UIDropdown).vm.$emit('update:visible', false)
    await flushPromises()
    expect(document.activeElement).toBe(toggle.element)
    await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
    await toggle.trigger('click')
    await flushPromises()
    wrapper.get<HTMLInputElement>('input').element.focus()
    wrapper.getComponent(UIDropdown).vm.$emit('update:visible', false)
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('input').element)
  })

  it('dismisses the category popup before collapsing search when Escape is pressed in the input', async () => {
    const wrapper = mountReference()
    await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
    await wrapper.get('input').setValue('开始')
    await wrapper.get('[aria-label="API categories"]').trigger('click')
    await flushPromises()
    wrapper.get<HTMLInputElement>('input').element.focus()
    await wrapper.get('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[aria-label="API category list"]').exists()).toBe(false)
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('开始')
    expect(document.activeElement).toBe(wrapper.get('input').element)
    await wrapper.get('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('preserves the active category when a hidden list receives a queued scroll event', async () => {
    const wrapper = mountReference()
    await flushPromises()
    const list = wrapper.get('[data-category-id="event"]').element.parentElement!
    await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
    await wrapper.get('input').setValue('开始')
    list.dispatchEvent(new Event('scroll'))
    await wrapper.get('[aria-label="API categories"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[aria-label="事件"]').attributes('aria-pressed')).toBe('true')
  })

  it('keeps the reached category selected when browser zoom leaves a fractional scroll position', async () => {
    const wrapper = mountReference()
    await flushPromises()
    const category = wrapper.get('[data-category-id="game"]').element
    const list = category.parentElement!
    Object.defineProperties(list, { clientHeight: { value: 100 }, scrollHeight: { value: 1000 } })
    Object.defineProperty(category, 'offsetTop', { value: 200 })
    list.scrollTop = 199.75
    list.dispatchEvent(new Event('scroll'))
    await wrapper.get('[aria-label="API categories"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[aria-label="游戏"]').attributes('aria-pressed')).toBe('true')
  })
})
