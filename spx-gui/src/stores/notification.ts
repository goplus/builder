import { computed, toValue, type WatchSource } from 'vue'
import { useAction } from '@/utils/exception'
import { useInfiniteQueryWithCache, useQueryCache, useQueryWithCache } from '@/utils/query'
import * as apis from '@/apis/notification'
import type { NotificationCategory } from '@/apis/notification'
import { useSignedIn } from './user'

function getNotificationsQueryKey(signedInUsernameInput: string | null) {
  return ['notifications', signedInUsernameInput]
}

/** Count of unread notifications of the signed-in user in the given category */
export function useUnreadNotificationCount(category: NotificationCategory) {
  const signedIn = useSignedIn()
  return useQueryWithCache({
    queryKey: computed(() => [...getNotificationsQueryKey(signedIn.username), 'unread-count', category]),
    async queryFn(signal) {
      const { total } = await apis.listNotifications({ category, read: false, pageSize: 1 }, signal)
      return total
    },
    failureSummaryMessage: { en: 'Failed to load unread notification count', zh: '加载未读通知数量失败' }
  })
}

const notificationsPageSize = 20

/** Notifications of the signed-in user in the given category, loaded page by page */
export function useNotifications(category: WatchSource<NotificationCategory>) {
  const signedIn = useSignedIn()
  return useInfiniteQueryWithCache({
    queryKey: computed(() => [...getNotificationsQueryKey(signedIn.username), 'list', toValue(category)]),
    queryFn: (pageToken, signal) =>
      apis.listNotifications(
        { category: toValue(category), pageToken: pageToken ?? undefined, pageSize: notificationsPageSize },
        signal
      ),
    getNextPageToken: (page) => page.nextPageToken,
    failureSummaryMessage: { en: 'Failed to load notifications', zh: '加载通知失败' }
  })
}

export function useMarkNotificationRead() {
  const queryCache = useQueryCache()
  const signedIn = useSignedIn()
  return useAction(
    async function markNotificationRead(id: string) {
      await apis.markNotificationRead(id)
      queryCache.invalidate(getNotificationsQueryKey(signedIn.username))
    },
    { en: 'Failed to mark notification as read', zh: '标记通知为已读失败' }
  )
}

export function useMarkAllNotificationsRead() {
  const queryCache = useQueryCache()
  const signedIn = useSignedIn()
  return useAction(
    async function markAllNotificationsRead() {
      await apis.markAllNotificationsRead()
      queryCache.invalidate(getNotificationsQueryKey(signedIn.username))
    },
    { en: 'Failed to mark all notifications as read', zh: '全部标记为已读失败' }
  )
}
