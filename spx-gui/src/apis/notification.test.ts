import { afterEach, describe, expect, it, vi } from 'vitest'
import { client } from './common'
import { listUserNotifications, markUserNotificationRead } from './notification'

afterEach(() => vi.restoreAllMocks())

describe('notification APIs', () => {
  it('lists authenticated user notifications with pagination', async () => {
    const response = { hasUnread: false, nextCursor: null, data: [] }
    const get = vi.spyOn(client, 'get').mockResolvedValue(response)

    const params = { pageSize: 50, cursor: 'next-page' }
    await expect(listUserNotifications(params)).resolves.toBe(response)
    expect(get).toHaveBeenCalledWith('/user/notifications', params, { signal: undefined })
  })

  it('marks a notification as read', async () => {
    const notification = { id: '11', readAt: '2026-08-26T00:00:00Z' }
    const patch = vi.spyOn(client, 'patch').mockResolvedValue(notification)

    await expect(markUserNotificationRead('11')).resolves.toBe(notification)
    expect(patch).toHaveBeenCalledWith('/user/notifications/11', { read: true }, { signal: undefined })
  })
})
