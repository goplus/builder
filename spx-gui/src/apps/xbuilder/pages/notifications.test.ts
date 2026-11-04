import { describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import { cloudHelpers } from '@/models/common/cloud'
import { NotificationCategory, type Notification } from '@/apis/notification'
import * as notificationApis from '@/apis/notification'

function mockNotifications(initial: Notification[]) {
  let notifications = initial
  vi.mocked(notificationApis.listNotifications).mockImplementation(async ({ category, read }) => {
    const data = notifications.filter((n) => n.category === category && (read == null || (n.readAt != null) === read))
    return { total: data.length, data, nextPageToken: null }
  })
  vi.mocked(notificationApis.markNotificationRead).mockImplementation(async (id) => {
    notifications = notifications.map((n) => (n.id === id ? { ...n, readAt: '2026-01-04T00:00:00Z' } : n))
  })
  vi.mocked(notificationApis.markAllNotificationsRead).mockImplementation(async () => {
    notifications = notifications.map((n) => ({ ...n, readAt: n.readAt ?? '2026-01-04T00:00:00Z' }))
  })
}

const reply: Notification = {
  id: '1',
  category: NotificationCategory.Message,
  title: 'Re: Sprite stops moving',
  body: 'Fixed in the next release\\.\n\n[fix.png](<kodo://test/fix.png>)\n\n[Unsafe link](javascript:alert)',
  createdAt: '2026-01-03T00:00:00Z',
  readAt: null
}

function getUnreadState(wrapper: VueWrapper) {
  return wrapper.get('[aria-label="Notifications"]').attributes('aria-description')
}

describe('notifications', () => {
  setupPageTests()

  it('shows a feedback reply and previews its image', async () => {
    await signIn()
    mockNotifications([reply])
    vi.spyOn(cloudHelpers, 'universalUrlToWebUrl').mockImplementation(async (url) =>
      url.replace('kodo://test/', 'https://assets.test/')
    )
    const { wrapper } = await mountPages('/explore')

    await vi.waitFor(() => expect(getUnreadState(wrapper)).toBe('Open notifications, 1 unread'))
    await wrapper.get('[aria-label="Notifications"]').trigger('click')
    const item = await vi.waitFor(() => wrapper.get('[aria-label="Re: Sprite stops moving"]'))
    expect(item.text()).toContain('Fixed in the next release. fix.png Unsafe link')
    // A button may only contain phrasing content
    expect(item.find('div, p').exists()).toBe(false)
    await item.trigger('click')

    await vi.waitFor(() => expect(notificationApis.markNotificationRead).toHaveBeenCalledWith('1'))
    const imageLink = await vi.waitFor(() => wrapper.get('a[href="https://assets.test/fix.png"]'))
    expect(wrapper.findAll('a').some((a) => a.text() === 'Unsafe link')).toBe(false)
    expect(wrapper.text()).toContain('Unsafe link')
    await vi.waitFor(() => expect(getUnreadState(wrapper)).toBe('Open notifications'))

    await imageLink.trigger('click')
    const previewImage = await vi.waitFor(() => {
      const img = document.querySelector('img[alt="fix.png"]')
      expect(img?.getAttribute('src')).toBe('https://assets.test/fix.png')
      return img!
    })
    // The app is cross-origin isolated (COEP `require-corp`), so user content images must be loaded with CORS
    expect(previewImage.getAttribute('crossorigin')).toBe('anonymous')
  })

  it('marks all notifications as read', async () => {
    await signIn()
    mockNotifications([
      reply,
      {
        id: '2',
        category: NotificationCategory.Announcement,
        title: 'New tutorials',
        body: 'Try the new tutorials.',
        createdAt: '2026-01-02T00:00:00Z',
        readAt: null
      }
    ])
    const { wrapper } = await mountPages('/explore')

    await vi.waitFor(() => expect(getUnreadState(wrapper)).toBe('Open notifications, 2 unread'))
    await wrapper.get('[aria-label="Notifications"]').trigger('click')
    await (await vi.waitFor(() => wrapper.get('[aria-label="Announcements tab"]'))).trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="New tutorials"]').exists()).toBe(true))
    const markAll = await vi.waitFor(() => wrapper.get('[aria-label="Mark all notifications as read"]'))
    await vi.waitFor(() => expect(markAll.attributes('disabled')).toBeUndefined())

    let finishRefresh!: () => void
    const refreshed = new Promise<void>((resolve) => (finishRefresh = resolve))
    const listNotifications = vi.mocked(notificationApis.listNotifications).getMockImplementation()!
    vi.mocked(notificationApis.listNotifications).mockImplementation(async (...args) => {
      await refreshed
      return listNotifications(...args)
    })
    await markAll.trigger('click')
    await vi.waitFor(() => expect(notificationApis.markAllNotificationsRead).toHaveBeenCalledTimes(1))
    await flushPromises()
    // Unread counts are still stale, so the button must stay disabled until they are refreshed
    expect(markAll.attributes('disabled')).toBeDefined()

    finishRefresh()
    await vi.waitFor(() => expect(getUnreadState(wrapper)).toBe('Open notifications'))
    expect(notificationApis.markAllNotificationsRead).toHaveBeenCalledTimes(1)
    expect(markAll.attributes('disabled')).toBeDefined()
  })
})
