import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { DefinitionKind, makeBasicMarkdownString, type DefinitionDocumentationItem } from '../../common'
import APIReferenceUI from './APIReferenceUI.vue'

vi.mock('./APIReferenceItem.vue', () => ({
  default: {
    name: 'APIReferenceItem',
    props: ['item'],
    template: '<li class="api-reference-item">{{ item.overview }}</li>'
  }
}))

vi.mock('@/utils/route-loading', () => ({
  useRegisterUpdateRouteLoaded: vi.fn()
}))

function makeItem(overview: string): DefinitionDocumentationItem {
  return {
    categories: [['event', 'game']],
    kind: DefinitionKind.Function,
    definition: { name: overview },
    insertSnippet: overview,
    overview,
    detail: makeBasicMarkdownString('')
  }
}

function mountAPIReference(variant: 'strip' | 'tutorial-side' = 'strip') {
  return mount(APIReferenceUI, {
    global: {
      mocks: {
        $t: (message: { en: string }) => message.en
      }
    },
    props: {
      variant,
      controller: {
        items: [makeItem('onStart => {}'), makeItem('step distance:100')],
        error: null,
        categoryViewInfos: [
          {
            id: 'event',
            label: { en: 'Event', zh: '事件' },
            icon: '',
            subCategories: [{ id: 'game', label: { en: 'Game', zh: '游戏' } }]
          }
        ]
      } as any,
      allowedOverviews: ['step distance']
    }
  })
}

describe('APIReferenceUI strip mode', () => {
  it('expands and collapses from the compact tutorial strip', async () => {
    const wrapper = mountAPIReference()
    const toggle = wrapper.get('[data-test-id="api-reference-strip-toggle"]')

    expect(wrapper.classes()).not.toContain('api-reference-strip-expanded')
    expect(toggle.text()).toBe('Expand')

    await toggle.trigger('click')

    expect(wrapper.classes()).toContain('api-reference-strip-expanded')
    expect(toggle.text()).toBe('Collapse')
  })

  it('shows tutorial references as a fixed side panel without expand controls', () => {
    const wrapper = mountAPIReference('tutorial-side')

    expect(wrapper.classes()).toContain('api-reference-tutorial-side')
    expect(wrapper.find('[data-test-id="api-reference-strip-toggle"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('step distance:100')
    expect(wrapper.text()).not.toContain('onStart => {}')
  })
})
