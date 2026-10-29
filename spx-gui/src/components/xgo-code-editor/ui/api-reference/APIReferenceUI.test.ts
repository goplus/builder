import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UIDropdown, UITextInput } from '@/components/ui'
import { DefinitionKind, makeBasicMarkdownString } from '../../common'
import type { APIReferenceController, APIReferenceItem } from '.'
import APIReferenceUI from './APIReferenceUI.vue'

vi.mock('@/utils/route-loading', () => ({ useRegisterUpdateRouteLoaded: () => undefined }))

const wrappers: Array<ReturnType<typeof mount>> = []

function mountReference(extraItems: APIReferenceItem[] = []) {
  const controller = {
    items: [
      {
        categories: [['event', 'game']],
        definition: { name: 'onStart' },
        kind: DefinitionKind.Listen,
        insertSnippet: 'onStart => {}',
        overview: 'onStart => {}',
        detail: makeBasicMarkdownString({ en: 'When game starts', zh: '游戏开始时执行' }),
        searchKeywords: ['共同', 'onClick handler']
      },
      {
        categories: [['game', 'others']],
        definition: { name: 'println' },
        kind: DefinitionKind.Command,
        insertSnippet: 'println "hi"',
        overview: 'println msg',
        detail: makeBasicMarkdownString({ en: 'Print a message', zh: '打印消息' }),
        searchKeywords: ['共同']
      },
      ...extraItems
    ],
    categoryViewInfos: [
      {
        id: 'event',
        label: { en: 'Event', zh: '事件' },
        icon: '',
        subCategories: [
          { id: 'game', label: { en: 'Game Events', zh: '游戏事件' } },
          { id: 'sensing', label: { en: 'Sensing Events', zh: '感知事件' } }
        ]
      },
      {
        id: 'game',
        label: { en: 'Game', zh: '游戏' },
        icon: '',
        subCategories: [
          { id: 'sprite', label: { en: 'Sprite Actions', zh: '精灵行为' } },
          { id: 'others', label: { en: 'Others', zh: '其他' } }
        ]
      }
    ],
    error: null
  } as unknown as APIReferenceController
  const wrapper = mount(APIReferenceUI, {
    attachTo: document.body,
    props: { controller },
    global: {
      mocks: { $t: (message: { zh: string }) => message.zh },
      directives: {
        radar: (el, { value }) => {
          el.setAttribute('aria-label', value.name)
          el.setAttribute('aria-description', value.desc)
        }
      },
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

  it('keeps the same secondary headings in browsing and search while retaining main category anchors', async () => {
    const wrapper = mountReference([
      {
        categories: [['event', 'sensing']],
        definition: { name: 'onClick' },
        kind: DefinitionKind.Listen,
        insertSnippet: 'onClick => {}',
        overview: 'onClick => {}',
        detail: makeBasicMarkdownString({ en: 'When clicked', zh: '点击时执行' }),
        searchKeywords: ['共同']
      },
      {
        categories: [['game', 'sprite']],
        definition: { name: 'clone' },
        kind: DefinitionKind.Command,
        insertSnippet: 'clone',
        overview: 'clone',
        detail: makeBasicMarkdownString({ en: 'Clone the sprite', zh: '复制精灵' }),
        searchKeywords: ['共同']
      }
    ])
    const visibleHeadings = () =>
      wrapper
        .findAll('h5')
        .filter((heading) => heading.isVisible())
        .map((heading) => heading.text())
    const browseHeadings = visibleHeadings()
    expect(browseHeadings).toEqual(['游戏事件', '感知事件', '精灵行为', '其他'])
    const toggle = wrapper.get('button[aria-expanded]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('input').exists()).toBe(false)
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(wrapper.get('input').element)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.findAll('h5').every((heading) => heading.isVisible())).toBe(true)
    await wrapper.get('input').setValue('共同')
    expect(visibleHeadings()).toEqual(browseHeadings)
    expect(
      wrapper
        .findAll('[data-category-id]')
        .filter((group) => group.isVisible())
        .map((group) => group.attributes('data-category-id'))
    ).toEqual(['event', 'game'])
    await wrapper.get('input').setValue('开始')
    expect(visibleHeadings()).toEqual(['游戏事件'])
    expect(wrapper.get('[role="status"]').text()).toBe('匹配到 1 个代码片段')
  })

  it.each(['toggle', 'Escape'])('clears and collapses through %s, returning focus to the toggle', async (action) => {
    const wrapper = mountReference()
    const toggle = wrapper.get('button[aria-expanded]')
    await toggle.trigger('click')
    await wrapper.get('input').setValue('开始')
    expect(wrapper.get('[role="status"]').text()).toBe('匹配到 1 个代码片段')
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
    expect(wrapper.get('[role="status"]').text()).toBe('未找到相关代码片段')
    expect(wrapper.text()).not.toContain('匹配到 0 个代码片段')
    await wrapper.get('input').setValue('开始')
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toBe('匹配到 1 个代码片段')
    expect(wrapper.get('[role="status"]').element).toBe(statusElement)
    expect(wrapper.text()).not.toContain('未找到相关代码片段')
  })

  it('opens category names from the header instead of displaying the category row inline', async () => {
    const wrapper = mountReference()
    const toggle = wrapper.get('[aria-label="API categories"]')
    expect(wrapper.find('[aria-label="API category list"]').exists()).toBe(false)
    await toggle.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[aria-label="API category list"] button').map((button) => button.text())).toEqual([
      '事件',
      '游戏'
    ])
    expect(document.activeElement).toBe(wrapper.get('button[aria-pressed="true"]').element)
    await toggle.trigger('click')
    expect(wrapper.find('[aria-label="API category list"]').exists()).toBe(false)
  })

  it('navigates between result groups without clearing the query or hiding other matches', async () => {
    const wrapper = mountReference()
    const browseList = wrapper.get('[data-category-id="game"]').element.parentElement!
    browseList.scrollTo = vi.fn()
    await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
    await wrapper.get('input').setValue('共同')
    const groups = wrapper.findAll('[data-category-id]').filter((group) => group.isVisible())
    expect(groups.map((group) => group.attributes('data-category-id'))).toEqual(['event', 'game'])
    const list = groups[0].element.parentElement!
    list.scrollTo = vi.fn()
    Object.defineProperty(groups[1].element, 'offsetTop', { value: 240 })
    await wrapper.get('[aria-label="API categories"]').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="游戏"]').trigger('click')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('共同')
    expect(wrapper.get('[role="status"]').text()).toBe('匹配到 2 个代码片段')
    expect(groups.flatMap((group) => group.findAll('h5').map((heading) => heading.text()))).toEqual([
      '游戏事件',
      '其他'
    ])
    expect(list.scrollTo).toHaveBeenCalledWith({ top: 240, behavior: 'smooth' })
    expect(browseList.scrollTo).not.toHaveBeenCalled()
    expect(groups.every((group) => group.isVisible())).toBe(true)
    expect(wrapper.find('[aria-label="API category list"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[aria-label="API categories"]').element)
    await wrapper.get('[aria-label="API categories"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[aria-label="游戏"]').attributes('aria-pressed')).toBe('true')
    await wrapper.get('[aria-label="事件"]').trigger('click')
    await flushPromises()
    expect(list.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' })
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('共同')
  })

  it('keeps secondary category order while ranking matching APIs stably within each secondary category', async () => {
    const wrapper = mountReference([
      {
        categories: [['event', 'sensing']],
        definition: { name: 'onSwipe' },
        kind: DefinitionKind.Listen,
        insertSnippet: 'onSwipe => {}',
        overview: 'onSwipe => {}',
        detail: makeBasicMarkdownString({ en: 'When swiped', zh: '滑动时执行' }),
        searchKeywords: ['onClick handler']
      },
      {
        categories: [['event', 'game']],
        definition: { name: 'Sprite.onClick' },
        kind: DefinitionKind.Listen,
        insertSnippet: 'onClick => {}',
        overview: 'onClick => {}',
        detail: makeBasicMarkdownString({ en: 'When clicked', zh: '点击时执行' })
      },
      {
        categories: [['event', 'sensing']],
        definition: { name: 'Game.onClick' },
        kind: DefinitionKind.Listen,
        insertSnippet: 'stageClick => {}',
        overview: 'stageClick => {}',
        detail: makeBasicMarkdownString({ en: 'When stage clicked', zh: '舞台被点击时执行' })
      },
      {
        categories: [['event', 'sensing']],
        definition: { name: 'Scene.onClick' },
        kind: DefinitionKind.Listen,
        insertSnippet: 'sceneClick => {}',
        overview: 'sceneClick => {}',
        detail: makeBasicMarkdownString({ en: 'When scene clicked', zh: '场景被点击时执行' })
      }
    ])
    await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
    await wrapper.get('input').setValue('onClick')
    const groups = wrapper.findAll('[data-category-id]').filter((group) => group.isVisible())
    expect(groups.map((group) => group.attributes('data-category-id'))).toEqual(['event'])
    const subCategories = groups[0].findAll('section')
    expect(subCategories.map((category) => category.get('h5').text())).toEqual(['游戏事件', '感知事件'])
    expect(subCategories[0].findAll('ul > li').map((item) => item.text())).toEqual(['onClick => {}', 'onStart => {}'])
    expect(subCategories[1].findAll('ul > li').map((item) => item.text())).toEqual([
      'stageClick => {}',
      'sceneClick => {}',
      'onSwipe => {}'
    ])
  })

  it('assigns a shared API to its first complete available path and sums secondary counts without duplicates', async () => {
    const wrapper = mountReference([
      {
        categories: [
          ['unknown', 'missing'],
          ['event', 'missing'],
          ['game', 'sprite'],
          ['game', 'others'],
          ['event', 'game'],
          ['event', 'sensing']
        ],
        definition: { name: 'shared' },
        kind: DefinitionKind.Command,
        insertSnippet: 'shared',
        overview: 'shared',
        detail: makeBasicMarkdownString({ en: 'Shared API', zh: '共享写法' }),
        searchKeywords: ['共同']
      }
    ])
    await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
    await wrapper.get('input').setValue('共同')
    const groups = wrapper.findAll('[data-category-id]').filter((group) => group.isVisible())
    expect(groups.map((group) => group.attributes('data-category-id'))).toEqual(['event', 'game'])
    expect(groups[0].text()).not.toContain('shared')
    expect(groups[0].findAll('h5').map((heading) => heading.text())).toEqual(['游戏事件'])
    const subCategories = groups[1].findAll('section')
    expect(subCategories.map((category) => category.get('h5').text())).toEqual(['精灵行为', '其他'])
    expect(subCategories[0].findAll('ul > li').map((item) => item.text())).toEqual(['shared'])
    expect(subCategories[1].findAll('ul > li').map((item) => item.text())).toEqual(['println msg'])
    expect(groups.flatMap((group) => group.findAll('ul > li')).filter((item) => item.text() === 'shared')).toHaveLength(
      1
    )
    expect(wrapper.get('[role="status"]').text()).toBe('匹配到 3 个代码片段')
    await wrapper.get('[aria-label="API categories"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[aria-label="事件"]').attributes('aria-description')).toBe('匹配到 1 个代码片段')
    expect(wrapper.get('[aria-label="游戏"]').attributes('aria-description')).toBe('匹配到 2 个代码片段')
  })

  it('disables categories without matches and updates the selected group when the query changes', async () => {
    const wrapper = mountReference()
    await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
    await wrapper.get('input').setValue('开始')
    await wrapper.get('[aria-label="API categories"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[aria-label="游戏"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="游戏"]').text()).toContain('0')
    expect(wrapper.get('[aria-label="游戏"]').attributes('aria-description')).toBe('匹配到 0 个代码片段')
    await wrapper.get('[aria-label="游戏"]').trigger('click')
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('开始')
    expect(wrapper.get('[aria-label="事件"]').attributes('aria-pressed')).toBe('true')
    await wrapper.get('input').setValue('打印')
    expect(wrapper.get('[aria-label="游戏"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[aria-label="游戏"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[aria-label="事件"]').attributes('disabled')).toBeDefined()
    await wrapper.get('input').setValue('没有这个功能')
    expect(wrapper.findAll('[aria-pressed="true"]')).toHaveLength(0)
    expect(
      wrapper
        .findAll('[aria-label="API category list"] button')
        .every((button) => button.attributes('disabled') != null)
    ).toBe(true)
  })

  it('restores the browse position and category when the search is cleared', async () => {
    const wrapper = mountReference()
    await flushPromises()
    const browseGroup = wrapper.get('[data-category-id="game"]').element
    const browseList = browseGroup.parentElement!
    Object.defineProperties(browseList, { clientHeight: { value: 100 }, scrollHeight: { value: 1000 } })
    Object.defineProperty(browseGroup, 'offsetTop', { value: 200 })
    browseList.scrollTop = 200
    browseList.dispatchEvent(new Event('scroll'))
    await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
    await wrapper.get('input').setValue('开始')
    await wrapper.getComponent(UITextInput).get('button').trigger('click')
    await wrapper.get('[aria-label="API categories"]').trigger('click')
    await flushPromises()
    expect(browseList.scrollTop).toBe(200)
    expect(wrapper.get('[aria-label="游戏"]').attributes('aria-pressed')).toBe('true')
  })

  it.each([
    { scrollTop: 199.75, height: 100, scrollHeight: 1000, expected: '游戏' },
    { scrollTop: 150, height: 100, scrollHeight: 250, expected: '游戏' },
    { scrollTop: 0, height: 500, scrollHeight: 300, expected: '事件' }
  ])(
    'tracks the visible search group with scroll geometry %j',
    async ({ scrollTop, height, scrollHeight, expected }) => {
      const wrapper = mountReference()
      await wrapper.get('[aria-label="Toggle API search"]').trigger('click')
      await wrapper.get('input').setValue('共同')
      const groups = wrapper.findAll('[data-category-id]').filter((group) => group.isVisible())
      const list = groups[0].element.parentElement!
      Object.defineProperties(list, { clientHeight: { value: height }, scrollHeight: { value: scrollHeight } })
      Object.defineProperty(groups[1].element, 'offsetTop', { value: 200 })
      list.scrollTop = scrollTop
      list.dispatchEvent(new Event('scroll'))
      await wrapper.get('[aria-label="API categories"]').trigger('click')
      await flushPromises()
      expect(wrapper.get(`[aria-label="${expected}"]`).attributes('aria-pressed')).toBe('true')
    }
  )

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
