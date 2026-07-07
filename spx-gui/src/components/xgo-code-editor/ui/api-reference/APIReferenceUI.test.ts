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

function mountStripAPIReference() {
  return mount(APIReferenceUI, {
    global: {
      mocks: {
        $t: (message: { en: string }) => message.en
      }
    },
    props: {
      variant: 'strip',
      controller: {
        items: [makeItem('onStart => {}')],
        error: null,
        categoryViewInfos: [
          {
            id: 'event',
            label: { en: 'Event', zh: '事件' },
            icon: '',
            subCategories: [{ id: 'game', label: { en: 'Game', zh: '游戏' } }]
          }
        ]
      } as any
    }
  })
}

describe('APIReferenceUI strip mode', () => {
  it('expands and collapses from the compact tutorial strip', async () => {
    const wrapper = mountStripAPIReference()
    const toggle = wrapper.get('[data-test-id="api-reference-strip-toggle"]')

    expect(wrapper.classes()).not.toContain('api-reference-strip-expanded')
    expect(toggle.text()).toBe('Expand')

    await toggle.trigger('click')

    expect(wrapper.classes()).toContain('api-reference-strip-expanded')
    expect(toggle.text()).toBe('Collapse')
  })
})
