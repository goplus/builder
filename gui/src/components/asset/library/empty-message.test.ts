import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createI18n, type Lang } from '@/utils/i18n'
import { createResolvedQueryRet } from '@/utils/query'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import { getAssetListEmptyMessage } from './empty-message'

enableAutoUnmount(afterEach)

function renderEmptyList(lang: Lang, keyword: string, slots: { empty?: string } = {}) {
  return mount(ListResultWrapper, {
    props: {
      queryRet: createResolvedQueryRet(() => []),
      emptyMessage: getAssetListEmptyMessage(keyword)
    },
    slots,
    global: {
      plugins: [createI18n({ lang })],
      stubs: { UIEmpty: { template: '<div><slot /></div>' } }
    }
  })
}

describe('asset library empty messages', () => {
  it('distinguishes an empty category from a search with no matches in both languages', () => {
    expect(renderEmptyList('en', '').text()).toBe('No assets yet')
    expect(renderEmptyList('en', 'dog').text()).toBe('No matching assets')
    expect(renderEmptyList('zh', '').text()).toBe('还没有素材')
    expect(renderEmptyList('zh', '小狗').text()).toBe('没有匹配的素材')
  })

  it('keeps the generation prompt as the only empty state when the library provides one', () => {
    const wrapper = renderEmptyList('en', 'dog', { empty: 'Generate an asset' })
    expect(wrapper.text()).toBe('Generate an asset')
  })
})
