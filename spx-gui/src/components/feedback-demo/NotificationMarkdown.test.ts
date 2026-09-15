import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NotificationMarkdown from './NotificationMarkdown.vue'

const content = `> **运行项目时一直卡在加载界面**
>
> 点击运行以后加载动画一直没有结束。
>
> [loading-screen.png](https://example.com/loading-screen.png "loading-screen.png")

问题已经修复。

[guide.png](https://example.com/guide.png "guide.png")

[project-page.png](https://example.com/project-page.png "project-page.png")`

describe('NotificationMarkdown', () => {
  it('keeps the quoted feedback, reply, attachments, and time in document order', () => {
    const wrapper = mount(NotificationMarkdown, {
      props: {
        value: content,
        time: '4 天前',
        timeTitle: '2026年9月10日上午9点40分',
        timeValue: '2026-09-10T09:40:00+08:00'
      }
    })
    const text = wrapper.text()

    expect(text.indexOf('运行项目时一直卡在加载界面')).toBeLessThan(text.indexOf('问题已经修复'))
    expect(text.indexOf('问题已经修复')).toBeLessThan(text.indexOf('guide.png'))
    expect(text.indexOf('guide.png')).toBeLessThan(text.indexOf('project-page.png'))
    expect(text.indexOf('project-page.png')).toBeLessThan(text.indexOf('4 天前'))
    expect(wrapper.findAll('.notification-markdown')).toHaveLength(1)
    expect(wrapper.get('.notification-markdown').text()).not.toContain('4 天前')
    expect(wrapper.get('time').element.previousElementSibling).toBe(wrapper.get('.notification-markdown').element)
    expect(wrapper.get('time').attributes()).toMatchObject({
      title: '2026年9月10日上午9点40分',
      datetime: '2026-09-10T09:40:00+08:00'
    })
  })

  it('renders image attachments as ordered Markdown links and previews the selected image', async () => {
    const wrapper = mount(NotificationMarkdown, {
      props: { value: content }
    })

    const attachmentLinks = wrapper.findAll('a.notification-attachment-link')
    expect(attachmentLinks.map((link) => link.text())).toEqual(['loading-screen.png', 'guide.png', 'project-page.png'])
    expect(attachmentLinks.every((link) => link.element.parentElement?.tagName === 'P')).toBe(true)
    expect(new Set(attachmentLinks.map((link) => link.element.parentElement)).size).toBe(3)
    expect(wrapper.find('button').exists()).toBe(false)

    await attachmentLinks[2].trigger('click')

    expect(wrapper.emitted('preview')).toEqual([
      [{ name: 'project-page.png', url: 'https://example.com/project-page.png' }]
    ])
  })

  it('leaves ordinary links as normal navigation', async () => {
    const wrapper = mount(NotificationMarkdown, {
      props: { value: '[查看项目](https://example.com/project)' }
    })

    await wrapper.get('a').trigger('click')

    expect(wrapper.emitted('preview')).toBeUndefined()
  })

  it('renders announcement content through the same single Markdown document boundary', () => {
    const wrapper = mount(NotificationMarkdown, {
      props: {
        value: 'XBuilder **V1.6** 已发布。',
        time: '5 天前'
      }
    })

    expect(wrapper.findAll('.notification-markdown')).toHaveLength(1)
    expect(wrapper.get('.notification-markdown strong').text()).toBe('V1.6')
    expect(wrapper.get('.notification-markdown').text()).not.toContain('5 天前')
    expect(wrapper.get('time').text()).toBe('5 天前')
  })
})
