<script lang="ts">
import type { LocaleMessage } from '@/utils/i18n'
import { NotificationCategory } from '@/apis/notification'

const tabs: Array<{ category: NotificationCategory; label: LocaleMessage }> = [
  { category: NotificationCategory.Message, label: { en: 'Messages', zh: '消息' } },
  { category: NotificationCategory.Announcement, label: { en: 'Announcements', zh: '公告' } }
]

function formatUnreadCount(count: number) {
  return count > 99 ? '99+' : String(count)
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'

import { useMessageHandle } from '@/utils/exception'
import { humanizeExactTime, humanizeTime } from '@/utils/utils'
import type { Notification } from '@/apis/notification'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount
} from '@/stores/notification'
import { UIButton, UIEmpty, UIError, UILoading, UITab, UITabs } from '@/components/ui'
import { getMarkdownText } from '@/components/common/markdown-vue/MarkdownView'
import NotificationMarkdown from './NotificationMarkdown.vue'

const unreadCountQueries = {
  [NotificationCategory.Message]: useUnreadNotificationCount(NotificationCategory.Message),
  [NotificationCategory.Announcement]: useUnreadNotificationCount(NotificationCategory.Announcement)
}

function getUnreadCount(category: NotificationCategory) {
  return unreadCountQueries[category].data.value ?? 0
}

const totalUnreadCount = computed(() => tabs.reduce((sum, tab) => sum + getUnreadCount(tab.category), 0))

// Show announcements first only when all unread notifications are announcements
const activeCategory = ref(
  getUnreadCount(NotificationCategory.Message) === 0 && getUnreadCount(NotificationCategory.Announcement) > 0
    ? NotificationCategory.Announcement
    : NotificationCategory.Message
)

const notificationsQuery = useNotifications(activeCategory)
const notifications = computed(() => notificationsQuery.data.value?.flatMap((page) => page.data) ?? null)
// Parse bodies when notifications are loaded, instead of each time the panel renders
const notificationPreviews = computed(() => notifications.value?.map((n) => getMarkdownText(n.body)) ?? [])

function handleListScroll(event: Event) {
  const list = event.currentTarget as HTMLElement
  // Start loading the next page a little before reaching the bottom, to keep scrolling smooth
  if (list.scrollHeight - list.scrollTop - list.clientHeight < 100) notificationsQuery.fetchNextPage()
}

const markNotificationRead = useMessageHandle(useMarkNotificationRead())
const markAllNotificationsRead = useMessageHandle(useMarkAllNotificationsRead())

const selectedNotification = shallowRef<Notification | null>(null)

function openNotification(notification: Notification) {
  selectedNotification.value = notification
  if (notification.readAt == null) markNotificationRead.fn(notification.id)
}
</script>

<template>
  <div
    v-radar="{ name: 'Notification panel', desc: 'Notifications of the signed-in user, grouped by category' }"
    class="flex h-[484px] w-[408px] flex-col"
    role="dialog"
  >
    <div v-show="selectedNotification == null" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center justify-between px-6 pb-3 pt-5">
        <h2 class="text-lg text-title">
          {{ $t({ en: 'Notifications', zh: '通知' }) }}
        </h2>
        <button
          v-radar="{
            name: 'Mark all notifications as read',
            desc: 'Mark unread notifications in all categories as read'
          }"
          type="button"
          class="cursor-pointer border-0 bg-transparent text-sm text-primary-main transition-colors enabled:hover:text-primary-600 disabled:cursor-default disabled:text-grey-600 focus-visible:outline-2 focus-visible:outline-primary-main"
          :disabled="totalUnreadCount === 0 || markAllNotificationsRead.isLoading.value"
          @click="markAllNotificationsRead.fn"
        >
          {{ $t({ en: 'Mark all as read', zh: '全部已读' }) }}
        </button>
      </div>

      <UITabs
        v-radar="{ name: 'Notification categories', desc: 'Tabs for switching between notification categories' }"
        class="shrink-0 border-b border-grey-300 px-6"
        :value="activeCategory"
        @update:value="(category) => (activeCategory = category as NotificationCategory)"
      >
        <UITab
          v-for="tab in tabs"
          :key="tab.category"
          v-radar="{ name: `${tab.label.en} tab`, desc: `Show ${tab.label.en.toLowerCase()}` }"
          class="border-b-0 px-0! pb-3 pt-2! text-sm"
          :class="activeCategory === tab.category ? 'text-primary-main' : null"
          :value="tab.category"
        >
          <span class="relative inline-block text-base">
            {{ $t(tab.label) }}
            <span
              v-if="activeCategory === tab.category"
              class="absolute inset-x-0 -bottom-[13px] h-0.5 bg-primary-main"
            ></span>
          </span>
          <span
            v-if="getUnreadCount(tab.category) > 0"
            class="ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-100 px-1 text-sm font-normal leading-[18px] text-red-main tabular-nums"
          >
            {{ formatUnreadCount(getUnreadCount(tab.category)) }}
          </span>
        </UITab>
      </UITabs>

      <div
        v-if="notifications != null && notifications.length === 0"
        class="flex min-h-0 flex-1 items-center justify-center"
      >
        <UIEmpty size="large" img="document" class="text-sm">
          {{ $t({ en: 'No notifications', zh: '暂无通知' }) }}
        </UIEmpty>
      </div>
      <div
        v-else-if="notifications != null"
        :key="activeCategory"
        class="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]"
        @scroll="handleListScroll"
      >
        <button
          v-for="(notification, i) in notifications"
          :key="notification.id"
          v-radar="{
            name: notification.title,
            desc: notification.readAt == null ? 'Unread notification' : 'Read notification'
          }"
          type="button"
          class="relative block w-full cursor-pointer rounded-lg border-0 bg-white p-3 text-left transition-colors hover:bg-grey-300 focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-primary-main"
          @click="openNotification(notification)"
        >
          <span class="flex items-start justify-between gap-3">
            <span class="flex min-w-0 flex-1 items-start gap-1">
              <span class="min-w-0 truncate text-base text-title" :title="notification.title">
                {{ notification.title }}
              </span>
              <span
                v-if="notification.readAt == null"
                aria-hidden="true"
                class="mt-0.5 size-2 shrink-0 rounded-full bg-red-main"
              ></span>
            </span>
            <time
              class="shrink-0 text-xs text-grey-700"
              :datetime="notification.createdAt"
              :title="$t(humanizeExactTime(notification.createdAt))"
              >{{ $t(humanizeTime(notification.createdAt)) }}</time
            >
          </span>
          <span class="mt-1 block truncate text-xs text-grey-800">{{ notificationPreviews[i] }}</span>
        </button>
        <UILoading v-if="notificationsQuery.isFetchingNextPage.value" class="py-3" />
        <button
          v-else-if="notificationsQuery.error.value != null && notificationsQuery.hasNextPage.value"
          v-radar="{ name: 'Retry loading notifications', desc: 'Load more notifications again' }"
          type="button"
          class="block w-full cursor-pointer border-0 bg-transparent py-3 text-sm text-primary-main hover:text-primary-600"
          @click="notificationsQuery.fetchNextPage"
        >
          {{ $t({ en: 'Failed to load more. Retry', zh: '加载失败，重试' }) }}
        </button>
      </div>
      <div v-else-if="notificationsQuery.isLoading.value" class="flex min-h-0 flex-1 items-center justify-center">
        <UILoading />
      </div>
      <UIError v-else-if="notificationsQuery.error.value != null" class="flex-1" :retry="notificationsQuery.refetch">
        {{ $t(notificationsQuery.error.value.userMessage) }}
      </UIError>
    </div>

    <div v-if="selectedNotification != null" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center gap-2 border-b border-grey-300 px-4 py-3">
        <UIButton
          v-radar="{ name: 'Back to notifications', desc: 'Return to the notification list' }"
          type="white"
          shape="square"
          size="medium"
          icon="angleLeft"
          @click="selectedNotification = null"
        />
        <h2 class="min-w-0 flex-1 truncate text-base font-normal text-title" :title="selectedNotification.title">
          {{ selectedNotification.title }}
        </h2>
      </div>
      <article class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <NotificationMarkdown :value="selectedNotification.body" :time="selectedNotification.createdAt" />
      </article>
    </div>
  </div>
</template>
