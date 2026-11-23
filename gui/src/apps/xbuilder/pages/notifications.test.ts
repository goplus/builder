import { describe, expect, it, vi } from 'vitest'
import { flushPromises, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import { cloudHelpers } from '@/models/common/cloud'
import { NotificationCategory, type Notification } from '@/apis/notification'
import * as notificationApis from '@/apis/notification'
import * as userApis from '@/apis/user'

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
  body: 'Fixed \\<audio\\> in the next release\\.\n\n![fix.png](<kodo://test/fix.png>)\n\n[photo.png](https://example.com/photo.png "Photo")\n\n[Unsafe link](javascript:alert)\n\n![unsafe.png](javascript:alert)\n\n[download.png](kodo://test/download.png)\n\n[![guide.png](kodo://test/guide.png)](https://example.com/guide)\n\n![web.png](https://example.com/web.png "Web screenshot")\n\n[Mail us](mailto:help@example.com) ![logo.png](/logo.png)',
  createdAt: '2026-01-03T00:00:00Z',
  readAt: null
}

function getUnreadState(wrapper: VueWrapper) {
  return wrapper.get('[aria-label="Notifications button"]').attributes('aria-description')
}

/** Whether clicking the link keeps its native behavior, such as opening it in a new tab */
async function isNativeClick(link: Pick<DOMWrapper<Element>, 'trigger'>, options: MouseEventInit = {}) {
  let defaultPrevented = true
  // Record whether the link prevented the navigation, then prevent it to stay on the page
  const listener = (event: Event) => {
    defaultPrevented = event.defaultPrevented
    event.preventDefault()
  }
  window.addEventListener('click', listener)
  await link.trigger('click', options)
  window.removeEventListener('click', listener)
  return !defaultPrevented
}

describe('notifications', () => {
  setupPageTests()

  it('shows a feedback reply and previews its image', async () => {
    await signIn()
    mockNotifications([reply])
    const universalUrlToWebUrl = cloudHelpers.universalUrlToWebUrl.bind(cloudHelpers)
    vi.spyOn(cloudHelpers, 'universalUrlToWebUrl').mockImplementation(async (url) =>
      url.startsWith('kodo://test/') ? url.replace('kodo://test/', 'https://assets.test/') : universalUrlToWebUrl(url)
    )
    const { wrapper } = await mountPages('/explore')

    await vi.waitFor(() => expect(getUnreadState(wrapper)).toBe('Open notifications, 1 unread'))
    await wrapper.get('[aria-label="Notifications button"]').trigger('click')
    const item = await vi.waitFor(() => wrapper.get('[aria-label="Re: Sprite stops moving"]'))
    expect(item.text()).toContain('Fixed <audio> in the next release. fix.png photo.png Unsafe link')
    await item.trigger('click')

    await vi.waitFor(() => expect(notificationApis.markNotificationRead).toHaveBeenCalledWith('1'))
    const imageLink = await vi.waitFor(() => wrapper.get('a[href="https://assets.test/fix.png"]'))
    expect(imageLink.get('img').attributes('src')).toBe('https://assets.test/fix.png')
    expect(imageLink.get('img').attributes('crossorigin')).toBe('anonymous')
    expect(wrapper.findAll('a').some((a) => a.text() === 'Unsafe link')).toBe(false)
    const body = wrapper.get('[aria-label="Notification panel"] article')
    expect(body.text()).toContain('Unsafe link')
    expect(body.text()).toContain('unsafe.png')
    expect(wrapper.find('img[alt="unsafe.png"]').exists()).toBe(false)
    const guideLink = wrapper.get('a[href="https://example.com/guide"]')
    await vi.waitFor(() => expect(guideLink.get('img').attributes('src')).toBe('https://assets.test/guide.png'))
    expect(guideLink.find('a').exists()).toBe(false)
    expect(await isNativeClick(guideLink)).toBe(true)
    await vi.waitFor(() => expect(getUnreadState(wrapper)).toBe('Open notifications'))
    // URLs other than Kodo URLs are kept as they are
    expect(wrapper.find('a[href="mailto:help@example.com"]').exists()).toBe(true)
    expect(wrapper.find('img[src="/logo.png"]').exists()).toBe(true)
    // Text links open their targets, even if the targets are images
    const photoLink = wrapper.get('a[href="https://example.com/photo.png"]')
    expect(photoLink.attributes('title')).toBe('Photo')
    expect(await isNativeClick(photoLink)).toBe(true)
    const fileLink = await vi.waitFor(() => wrapper.get('a[href="https://assets.test/download.png"]'))
    expect(await isNativeClick(fileLink)).toBe(true)
    for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }]) {
      expect(await isNativeClick(imageLink, options)).toBe(true)
    }

    expect(await isNativeClick(imageLink)).toBe(false)
    const previewImage = await vi.waitFor(() => {
      const modal = document.querySelector('[aria-label="Notification image preview modal"]')
      expect(modal?.querySelector('h2')?.textContent).toBe('fix.png')
      const img = modal?.querySelector('img')
      expect(img?.getAttribute('src')).toBe('https://assets.test/fix.png')
      return img!
    })
    // The app is cross-origin isolated (COEP `require-corp`), so user content images must be loaded with CORS
    expect(previewImage.getAttribute('crossorigin')).toBe('anonymous')
    document.querySelector('[aria-label="Close button"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Notification image preview modal"]')).toBeNull())

    // Images are previewed wherever they are stored, named by their titles if any
    await wrapper.get('a[href="https://example.com/web.png"]').trigger('click')
    await vi.waitFor(() => {
      const modal = document.querySelector('[aria-label="Notification image preview modal"]')
      expect(modal?.querySelector('h2')?.textContent).toBe('Web screenshot')
      expect(modal?.querySelector('img')?.getAttribute('src')).toBe('https://example.com/web.png')
    })
  })

  it('does not keep an open notification when another tab switches accounts', async () => {
    await signIn()
    mockNotifications([reply])
    const { wrapper, signedIn } = await mountPages('/explore')
    await vi.waitFor(() => expect(getUnreadState(wrapper)).toBe('Open notifications, 1 unread'))
    await wrapper.get('[aria-label="Notifications button"]').trigger('click')
    await (await vi.waitFor(() => wrapper.get('[aria-label="Re: Sprite stops moving"]'))).trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Fixed <audio>'))
    mockNotifications([{ ...reply, id: 'bob-message', title: 'For Bob', body: 'Bob reply' }])
    const alice = await userApis.getSignedInUser()
    vi.mocked(userApis.getSignedInUser).mockResolvedValue({ ...alice, username: 'bob' })
    localStorage.setItem(
      'builder-user',
      JSON.stringify({
        username: 'bob',
        accessToken: 'bob-token',
        accessTokenExpiresAt: Date.now() + 3_600_000,
        refreshToken: null
      })
    )
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    await vi.waitFor(() => expect(signedIn.username).toBe('bob'))
    await flushPromises()
    expect(wrapper.text()).not.toContain('Fixed <audio>')
    await wrapper.get('[aria-label="Notifications button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('For Bob'))
    expect(wrapper.text()).not.toContain('Re: Sprite stops moving')
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
    await wrapper.get('[aria-label="Notifications button"]').trigger('click')
    await (await vi.waitFor(() => wrapper.get('[aria-label="Announcements"]'))).trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="New tutorials"]').exists()).toBe(true))
    const markAll = await vi.waitFor(() => wrapper.get('[aria-label="Mark all as read button"]'))
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
