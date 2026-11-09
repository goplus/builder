import { client, type ByPageToken } from './common'

export enum NotificationCategory {
  /** Messages related to the user, such as replies to their feedback */
  Message = 'message',
  /** Announcements from XBuilder */
  Announcement = 'announcement'
}

export type Notification = {
  /** Unique identifier */
  id: string
  category: NotificationCategory
  title: string
  /** Body in Markdown */
  body: string
  /** Creation timestamp */
  createdAt: string
  /** Time when the user first read the notification, `null` if unread */
  readAt: string | null
}

export type ListNotificationsParams = {
  category: NotificationCategory
  /** Filter notifications by read state, omit to list both read and unread ones */
  read?: boolean
  /** The `nextPageToken` of the previous page, omit to get the first page */
  pageToken?: string
  pageSize?: number
}

/** List notifications of the signed-in user in one category, newest first */
export function listNotifications(params: ListNotificationsParams, signal?: AbortSignal) {
  return client.get('/user/notifications', params, { signal }) as Promise<ByPageToken<Notification>>
}

export function markNotificationRead(id: string) {
  return client.put(`/user/notifications/${encodeURIComponent(id)}/read`) as Promise<void>
}

/** Mark all unread notifications of the signed-in user as read, across all categories */
export function markAllNotificationsRead() {
  return client.put('/user/notifications/read') as Promise<void>
}
