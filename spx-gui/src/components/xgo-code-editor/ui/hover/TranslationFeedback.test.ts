import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TranslationFeedback from './TranslationFeedback.vue'

vi.mock('@/components/ui', () => ({
  UIIcon: {
    props: ['type'],
    template: '<i :data-icon-type="type"></i>'
  }
}))

describe('TranslationFeedback', () => {
  it.each([
    ['failed', 'text-red-main', 'errorTriangle', '翻译失败，请稍后重试。'],
    ['rate-limited', 'text-red-main', 'errorTriangle', '翻译请求过于频繁，请稍后重试。'],
    ['quota-exceeded', 'text-yellow-main', 'warning', '翻译额度已用完，请稍后重试。']
  ] as const)('renders the %s state without a retry button', (kind, colorClass, icon, message) => {
    const wrapper = mount(TranslationFeedback, {
      props: { kind },
      global: {
        mocks: {
          $t: (value: { zh: string }) => value.zh
        }
      }
    })

    expect(wrapper.classes()).toContain(colorClass)
    expect(wrapper.get('[data-icon-type]').attributes('data-icon-type')).toBe(icon)
    expect(wrapper.text()).toBe(message)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
