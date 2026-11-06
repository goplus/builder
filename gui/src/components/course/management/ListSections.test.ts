import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ListSections from './ListSections.vue'
import type { ListIndexEntry, ListSection } from './list-view'

vi.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (message: { en: string }) => message.en })
}))

const label = (key: string) => ({ en: key, zh: key })
const index: ListIndexEntry[] = ['B', 'C', 'X'].map((key) => ({ key, label: label(key) }))
const sections: ListSection<string>[] = ['B', 'C', 'X'].map((key) => ({ key, label: label(key), items: [key] }))

async function mountSections() {
  const wrapper = mount(ListSections<string>, {
    props: { sections, index, showIndex: true },
    attachTo: document.body,
    global: { directives: { radar: {} } }
  })
  // Sections one below another, the first at the top of the list.
  wrapper.findAll('[data-section-key]').forEach((section, i) => {
    section.element.getBoundingClientRect = () => ({ top: i * 1000 }) as DOMRect
  })
  wrapper.find('[data-section-key]').element.parentElement!.getBoundingClientRect = () => ({ top: 0 }) as DOMRect
  await flushPromises()
  return wrapper
}

function activeEntry(wrapper: Awaited<ReturnType<typeof mountSections>>) {
  return (
    wrapper
      .findAll('nav button')
      .find((button) => button.classes('bg-primary-main'))
      ?.text() ?? null
  )
}

describe('ListSections', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('leaves the index alone on scrolls that do not move the list', async () => {
    const wrapper = await mountSections()
    // Sections given again are measured again, which marks the first, as the list stands at its top.
    await wrapper.setProps({ sections: [...sections] })
    await new Promise((r) => setTimeout(r, 10))
    expect(activeEntry(wrapper)).toBe('B')

    // A drawer scrolled to its end, outside the list.
    const drawer = document.createElement('div')
    document.body.append(drawer)
    drawer.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 10))
    expect(activeEntry(wrapper)).toBe('B')
    wrapper.unmount()
  })

  it('follows scrolls of an element that holds the list', async () => {
    const wrapper = await mountSections()
    const scroller = document.createElement('div')
    document.body.append(scroller)
    scroller.append(wrapper.element)
    // At the end of what scrolls, the last section is the one being looked at.
    scroller.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 10))
    expect(activeEntry(wrapper)).toBe('X')
    wrapper.unmount()
  })
})
