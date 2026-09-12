import { client } from './common'

export type UserNotification = {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  body: string
  actionPath?: string
  readAt: string | null
}

export type UserNotifications = {
  hasUnread: boolean
  nextCursor: string | null
  data: UserNotification[]
}

export type ListUserNotificationsParams = {
  pageSize?: number
  cursor?: string
}

export function listUserNotifications(params?: ListUserNotificationsParams, signal?: AbortSignal) {
  return client.get('/user/notifications', params, { signal }) as Promise<UserNotifications>
}

export function markUserNotificationRead(notificationID: string, signal?: AbortSignal) {
  return client.patch(
    `/user/notifications/${encodeURIComponent(notificationID)}`,
    {
      read: true
    },
    { signal }
  ) as Promise<UserNotification>
}
