import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserNotification } from '@/apis/notification'
import { createI18n } from '@/utils/i18n'
import NavbarNotifications from './NavbarNotifications.vue'

const mocks = vi.hoisted(() => ({
  useSignedInUser: vi.fn(),
  push: vi.fn(),
  list: vi.fn(),
  markRead: vi.fn()
}))

vi.mock('@/stores/user', () => ({ useSignedInUser: mocks.useSignedInUser }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/apis/notification', () => ({
  listUserNotifications: mocks.list,
  markUserNotificationRead: mocks.markRead
}))
vi.mock('@/utils/exception', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/exception')>()
  return {
    ...original,
    useMessageHandle: (fn: (...args: any[]) => unknown) => ({
      fn: async (...args: any[]) => {
        try {
          await fn(...args)
        } catch {
          // Production useMessageHandle reports and consumes action failures.
        }
      },
      isLoading: ref(false)
    })
  }
})

const notification: UserNotification = {
  id: '11',
  createdAt: '2026-08-26T06:02:00Z',
  updatedAt: '2026-08-26T06:02:00Z',
  title: 'Support replied',
  body: 'Please try again.',
  actionPath: '/feedbacks/3',
  readAt: null
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const mountedWrappers: ReturnType<typeof mount>[] = []

function mountNotifications() {
  const wrapper = mount(NavbarNotifications, {
    global: {
      plugins: [createI18n({ lang: 'en' })],
      directives: { radar: () => undefined },
      stubs: {
        UIIcon: true,
        UIButton: {
          props: ['disabled', 'loading'],
          emits: ['click'],
          template:
            '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot name="icon"/><slot/></button>'
        },
        UIModal: {
          props: ['visible'],
          emits: ['update:visible'],
          template: '<div v-if="visible" role="dialog"><slot/></div>'
        }
      }
    }
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  for (const wrapper of mountedWrappers) wrapper.unmount()
  mountedWrappers.length = 0
})

describe('NavbarNotifications', () => {
  it('does not fetch or render notifications without a signed-in user', async () => {
    mocks.useSignedInUser.mockReturnValue(ref(null))

    const wrapper = mountNotifications()
    await flushPromises()

    expect(wrapper.find('button').exists()).toBe(false)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('refreshes notifications when opened', async () => {
    mocks.useSignedInUser.mockReturnValue(ref({ id: 'user-1' }))
    mocks.list.mockResolvedValue({ hasUnread: true, nextCursor: null, data: [] })

    const wrapper = mountNotifications()
    await flushPromises()
    expect(mocks.list).toHaveBeenCalledTimes(1)

    await wrapper.get('[aria-label="Notifications, unread notifications available"]').trigger('click')
    await flushPromises()
    expect(mocks.list).toHaveBeenCalledTimes(2)
  })

  it('loads pages, marks a notification read, and opens its application route', async () => {
    mocks.useSignedInUser.mockReturnValue(ref({ id: 'user-1' }))
    mocks.list
      .mockResolvedValueOnce({ hasUnread: true, nextCursor: 'next-page', data: [{ ...notification }] })
      .mockResolvedValueOnce({ hasUnread: true, nextCursor: 'next-page', data: [{ ...notification }] })
      .mockResolvedValueOnce({
        hasUnread: true,
        nextCursor: null,
        data: [
          {
            ...notification,
            id: '10',
            createdAt: '2026-08-25T06:02:00Z',
            title: 'Earlier notification',
            readAt: '2026-08-26T07:00:00Z'
          }
        ]
      })
    mocks.markRead.mockResolvedValue({ ...notification, readAt: '2026-08-26T07:01:00Z' })

    const wrapper = mountNotifications()
    await flushPromises()
    await wrapper.get('[aria-label="Notifications, unread notifications available"]').trigger('click')
    await flushPromises()
    expect(mocks.list).toHaveBeenNthCalledWith(2, { pageSize: 50 }, expect.any(AbortSignal))

    const loadMoreButton = wrapper.findAll('button').find((button) => button.text().includes('Load more'))
    expect(loadMoreButton).toBeDefined()
    await loadMoreButton!.trigger('click')
    await flushPromises()
    expect(mocks.list).toHaveBeenNthCalledWith(
      3,
      {
        pageSize: 50,
        cursor: 'next-page'
      },
      expect.any(AbortSignal)
    )
    expect(wrapper.text()).toContain('Earlier notification')

    const notificationButton = wrapper.findAll('button').find((button) => button.text().includes(notification.title))
    await notificationButton!.trigger('click')
    await flushPromises()
    expect(mocks.markRead).toHaveBeenCalledWith(notification.id, expect.any(AbortSignal))
    expect(wrapper.get('[aria-label="Notifications"]').find('.absolute').exists()).toBe(false)

    const viewDetailsButton = wrapper.findAll('button').find((button) => button.text().includes('View details'))
    await viewDetailsButton!.trigger('click')
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith(notification.actionPath)
  })

  it('does not overwrite a completed read with a stale cursor page response', async () => {
    mocks.useSignedInUser.mockReturnValue(ref({ id: 'user-1' }))
    const pendingPage = deferred<{
      hasUnread: boolean
      nextCursor: string | null
      data: (typeof notification)[]
    }>()
    mocks.list
      .mockResolvedValueOnce({ hasUnread: true, nextCursor: 'next-page', data: [{ ...notification }] })
      .mockResolvedValueOnce({ hasUnread: true, nextCursor: 'next-page', data: [{ ...notification }] })
      .mockReturnValueOnce(pendingPage.promise)
    mocks.markRead.mockResolvedValue({ ...notification, readAt: '2026-08-26T07:01:00Z' })

    const wrapper = mountNotifications()
    await flushPromises()
    await wrapper.get('[aria-label="Notifications, unread notifications available"]').trigger('click')
    await flushPromises()

    const loadMoreButton = wrapper.findAll('button').find((button) => button.text().includes('Load more'))
    await loadMoreButton!.trigger('click')
    const pageSignal = mocks.list.mock.calls[2][1] as AbortSignal
    const notificationButton = wrapper.findAll('button').find((button) => button.text().includes(notification.title))
    await notificationButton!.trigger('click')
    expect(pageSignal.aborted).toBe(true)
    await flushPromises()
    expect(wrapper.get('[aria-label="Notifications"]').find('.absolute').exists()).toBe(false)

    pendingPage.resolve({ hasUnread: true, nextCursor: null, data: [] })
    await flushPromises()
    expect(wrapper.get('[aria-label="Notifications"]').find('.absolute').exists()).toBe(false)
  })

  it('does not append a notification again when marking it read moves it behind the cursor', async () => {
    const earlierNotification = {
      ...notification,
      id: '10',
      createdAt: '2026-08-25T06:02:00Z',
      title: 'Earlier notification',
      readAt: '2026-08-26T07:00:00Z'
    }
    mocks.useSignedInUser.mockReturnValue(ref({ id: 'user-1' }))
    mocks.list
      .mockResolvedValueOnce({ hasUnread: true, nextCursor: 'next-page', data: [{ ...notification }] })
      .mockResolvedValueOnce({ hasUnread: true, nextCursor: 'next-page', data: [{ ...notification }] })
      .mockResolvedValueOnce({
        hasUnread: false,
        nextCursor: null,
        data: [{ ...notification, readAt: '2026-08-26T07:01:00Z' }, earlierNotification]
      })
    mocks.markRead.mockResolvedValue({ ...notification, readAt: '2026-08-26T07:01:00Z' })

    const wrapper = mountNotifications()
    await flushPromises()
    await wrapper.get('[aria-label="Notifications, unread notifications available"]').trigger('click')
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes(notification.title))!
      .trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="Back to notifications"]').trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Load more'))!
      .trigger('click')
    await flushPromises()

    expect(wrapper.findAll('button').filter((button) => button.text().includes(notification.title))).toHaveLength(1)
    expect(wrapper.text()).toContain(earlierNotification.title)
  })

  it('waits for mark-as-read before clearing the unread indicator', async () => {
    mocks.useSignedInUser.mockReturnValue(ref({ id: 'user-1' }))
    mocks.list.mockResolvedValue({ hasUnread: true, nextCursor: 'next-page', data: [{ ...notification }] })
    const pendingRead = deferred<typeof notification>()
    mocks.markRead.mockReturnValue(pendingRead.promise)

    const wrapper = mountNotifications()
    await flushPromises()
    await wrapper.get('[aria-label="Notifications, unread notifications available"]').trigger('click')
    await flushPromises()
    const notificationButton = wrapper.findAll('button').find((button) => button.text().includes(notification.title))
    await notificationButton!.trigger('click')

    expect(wrapper.get('[aria-label="Notifications, unread notifications available"]').find('.absolute').exists()).toBe(
      true
    )
    await wrapper.get('[aria-label="Back to notifications"]').trigger('click')
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.text().includes('Load more'))!
        .attributes('disabled')
    ).toBe('')
    pendingRead.resolve({ ...notification, readAt: '2026-08-26T07:01:00Z' })
    await flushPromises()
    expect(wrapper.get('[aria-label="Notifications"]').find('.absolute').exists()).toBe(false)
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.text().includes('Load more'))!
        .attributes('disabled')
    ).toBe(undefined)
  })

  it('silently keeps a notification unread and retryable when marking it read fails', async () => {
    mocks.useSignedInUser.mockReturnValue(ref({ id: 'user-1' }))
    mocks.list.mockResolvedValue({ hasUnread: true, nextCursor: null, data: [{ ...notification }] })
    mocks.markRead.mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce({
      ...notification,
      readAt: '2026-08-26T07:01:00Z'
    })

    const wrapper = mountNotifications()
    await flushPromises()
    await wrapper.get('[aria-label="Notifications, unread notifications available"]').trigger('click')
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes(notification.title))!
      .trigger('click')
    await flushPromises()

    expect(wrapper.get('[aria-label="Notifications, unread notifications available"]').find('.absolute').exists()).toBe(
      true
    )

    await wrapper.get('[aria-label="Back to notifications"]').trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes(notification.title))!
      .trigger('click')
    await flushPromises()

    expect(mocks.markRead).toHaveBeenCalledTimes(2)
  })

  it('keeps a notification in place after marking it as read', async () => {
    const olderUnread = {
      ...notification,
      id: '10',
      createdAt: '2026-08-25T06:02:00Z',
      title: 'Older unread notification'
    }
    mocks.useSignedInUser.mockReturnValue(ref({ id: 'user-1' }))
    mocks.list.mockResolvedValue({
      hasUnread: true,
      nextCursor: null,
      data: [{ ...notification }, olderUnread]
    })
    mocks.markRead.mockResolvedValue({ ...notification, readAt: '2026-08-26T07:01:00Z' })

    const wrapper = mountNotifications()
    await flushPromises()
    await wrapper.get('[aria-label="Notifications, unread notifications available"]').trigger('click')
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes(notification.title))!
      .trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="Back to notifications"]').trigger('click')

    const rows = wrapper.findAll('button').filter((button) => button.find('time').exists())
    expect(rows[0].text()).toContain(notification.title)
    expect(rows[0].find('.bg-primary-main').exists()).toBe(false)
    expect(rows[1].text()).toContain(olderUnread.title)
    expect(rows[1].find('.bg-primary-main').exists()).toBe(true)
  })

  it('marks different notifications as read concurrently', async () => {
    const anotherNotification = { ...notification, id: '12', title: 'Another notification' }
    mocks.useSignedInUser.mockReturnValue(ref({ id: 'user-1' }))
    mocks.list.mockResolvedValue({
      hasUnread: true,
      nextCursor: null,
      data: [{ ...notification }, anotherNotification]
    })
    const firstRead = deferred<typeof notification>()
    const secondRead = deferred<typeof notification>()
    mocks.markRead.mockReturnValueOnce(firstRead.promise).mockReturnValueOnce(secondRead.promise)

    const wrapper = mountNotifications()
    await flushPromises()
    await wrapper.get('[aria-label="Notifications, unread notifications available"]').trigger('click')
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes(notification.title))!
      .trigger('click')
    await wrapper.get('[aria-label="Back to notifications"]').trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes(anotherNotification.title))!
      .trigger('click')

    expect(mocks.markRead).toHaveBeenCalledTimes(2)
    expect((mocks.markRead.mock.calls[0][1] as AbortSignal).aborted).toBe(false)
    expect((mocks.markRead.mock.calls[1][1] as AbortSignal).aborted).toBe(false)
  })

  it('restarts the first page when reopened during an in-flight page request', async () => {
    mocks.useSignedInUser.mockReturnValue(ref({ id: 'user-1' }))
    const pendingPage = deferred<{ hasUnread: boolean; nextCursor: string | null; data: UserNotification[] }>()
    mocks.list
      .mockResolvedValueOnce({ hasUnread: false, nextCursor: 'next-page', data: [{ ...notification }] })
      .mockResolvedValueOnce({ hasUnread: false, nextCursor: 'next-page', data: [{ ...notification }] })
      .mockReturnValueOnce(pendingPage.promise)
      .mockResolvedValueOnce({
        hasUnread: false,
        nextCursor: null,
        data: [{ ...notification, title: 'Refreshed notification' }]
      })

    const wrapper = mountNotifications()
    await flushPromises()
    await wrapper.get('[aria-label="Notifications"]').trigger('click')
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Load more'))!
      .trigger('click')
    const pageSignal = mocks.list.mock.calls[2][1] as AbortSignal

    await wrapper.get('[aria-label="Close notifications"]').trigger('click')
    await wrapper.get('[aria-label="Notifications"]').trigger('click')
    await flushPromises()

    expect(pageSignal.aborted).toBe(true)
    expect(mocks.list).toHaveBeenCalledTimes(4)
    expect(wrapper.text()).toContain('Refreshed notification')
  })

  it.each([`/\\example.com`, '/\t/evil.com'])('does not open the unsafe notification action %j', async (actionPath) => {
    mocks.useSignedInUser.mockReturnValue(ref({ id: 'user-1' }))
    mocks.list.mockResolvedValue({
      hasUnread: false,
      nextCursor: null,
      data: [{ ...notification, actionPath, readAt: '2026-08-26T07:00:00Z' }]
    })

    const wrapper = mountNotifications()
    await flushPromises()
    await wrapper.get('[aria-label="Notifications"]').trigger('click')
    await flushPromises()
    const notificationButton = wrapper.findAll('button').find((button) => button.text().includes(notification.title))
    await notificationButton!.trigger('click')
    const viewDetailsButton = wrapper.findAll('button').find((button) => button.text().includes('View details'))
    await viewDetailsButton!.trigger('click')
    await flushPromises()

    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('does not let an old failed read request affect a new user session', async () => {
    const user = ref<{ id: string } | null>({ id: 'user-1' })
    const pendingRead = deferred<typeof notification>()
    mocks.useSignedInUser.mockReturnValue(user)
    mocks.list
      .mockResolvedValueOnce({ hasUnread: true, nextCursor: null, data: [{ ...notification }] })
      .mockResolvedValueOnce({ hasUnread: true, nextCursor: null, data: [{ ...notification }] })
      .mockResolvedValueOnce({ hasUnread: false, nextCursor: null, data: [] })
    mocks.markRead.mockReturnValue(pendingRead.promise)

    const wrapper = mountNotifications()
    await flushPromises()
    expect(wrapper.get('[aria-label="Notifications, unread notifications available"]').find('.absolute').exists()).toBe(
      true
    )

    await wrapper.get('[aria-label="Notifications, unread notifications available"]').trigger('click')
    await flushPromises()
    const notificationButton = wrapper.findAll('button').find((button) => button.text().includes(notification.title))
    expect(notificationButton).toBeDefined()
    await notificationButton!.trigger('click')
    expect(mocks.markRead).toHaveBeenCalledWith(notification.id, expect.any(AbortSignal))

    user.value = { id: 'user-2' }
    await flushPromises()
    expect(wrapper.get('[aria-label="Notifications"]').find('.absolute').exists()).toBe(false)

    pendingRead.reject(new Error('old request failed'))
    await flushPromises()
    expect(wrapper.get('[aria-label="Notifications"]').find('.absolute').exists()).toBe(false)
  })
})
