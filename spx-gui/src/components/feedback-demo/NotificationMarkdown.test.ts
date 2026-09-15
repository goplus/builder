import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NotificationMarkdown from './NotificationMarkdown.vue'

const content = `问题已经修复。

[查看附件：处理说明](https://example.com/guide.png)

> **运行项目时一直卡在加载界面**
>
> 点击运行以后加载动画一直没有结束。`

describe('NotificationMarkdown', () => {
  it('places the notification time between the reply and quoted feedback', () => {
    const wrapper = mount(NotificationMarkdown, {
      props: {
        value: content,
        time: '4 天前',
        timeTitle: '2026年9月10日上午9点40分',
        timeValue: '2026-09-10T09:40:00+08:00'
      }
    })
    const text = wrapper.text()

    expect(text.indexOf('问题已经修复')).toBeLessThan(text.indexOf('4 天前'))
    expect(text.indexOf('4 天前')).toBeLessThan(text.indexOf('运行项目时一直卡在加载界面'))
    expect(wrapper.findAll('.notification-markdown')).toHaveLength(1)
    expect(wrapper.get('time').attributes()).toMatchObject({
      title: '2026年9月10日上午9点40分',
      datetime: '2026-09-10T09:40:00+08:00'
    })
  })

  it('renders an image attachment link as a 26px white button and emits a preview request', async () => {
    const wrapper = mount(NotificationMarkdown, {
      props: { value: content }
    })

    const attachmentButton = wrapper.get('button')
    expect(attachmentButton.classes()).toContain('h-[26px]')
    expect(attachmentButton.attributes('style')).toContain('--ui-button-bg-color: var(--ui-color-grey-100)')

    await attachmentButton.trigger('click')

    expect(wrapper.emitted('preview')).toEqual([[{ name: '查看附件：处理说明', url: 'https://example.com/guide.png' }]])
  })

  it('leaves ordinary links as normal navigation', async () => {
    const wrapper = mount(NotificationMarkdown, {
      props: { value: '[查看项目](https://example.com/project)' }
    })

    await wrapper.get('a').trigger('click')

    expect(wrapper.emitted('preview')).toBeUndefined()
  })
})
