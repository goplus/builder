<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import * as notificationApis from '@/apis/notification'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useSignedInUser } from '@/stores/user'
import { UIButton, UIIcon, UIModal } from '@/components/ui'

const pageSize = 50

const router = useRouter()
const i18n = useI18n()
const signedInUser = useSignedInUser()
const visible = ref(false)
const notifications = ref<notificationApis.UserNotification[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const hasUnread = ref(false)
const markingReadNotificationIDs = ref(new Set<string>())
const selectedNotificationID = ref<string | null>(null)
const selectedNotification = computed(
  () => notifications.value.find((notification) => notification.id === selectedNotificationID.value) ?? null
)
const notificationLabel = computed(() =>
  hasUnread.value
    ? i18n.t({ en: 'Notifications, unread notifications available', zh: '通知，有未读通知' })
    : i18n.t({ en: 'Notifications', zh: '通知' })
)
const notificationRadar = computed(() => ({
  name: notificationLabel.value,
  desc: hasUnread.value
    ? i18n.t({ en: 'Open unread in-product notifications', zh: '打开未读站内通知' })
    : i18n.t({ en: 'Open in-product notifications', zh: '打开站内通知' })
}))

let listRequest: AbortController | null = null
const readRequests = new Map<string, AbortController>()

function abortListRequest() {
  listRequest?.abort()
  listRequest = null
  loading.value = false
}

async function loadNotifications(reset: boolean) {
  if (signedInUser.value == null) return
  if (loading.value && !reset) return
  if (reset) abortListRequest()
  const cursor = reset ? undefined : nextCursor.value ?? undefined
  if (!reset && cursor == null) return
  const request = new AbortController()
  listRequest = request
  loading.value = true
  try {
    const result = await notificationApis.listUserNotifications(
      { pageSize, ...(cursor != null ? { cursor } : {}) },
      request.signal
    )
    request.signal.throwIfAborted()
    if (reset) {
      notifications.value = result.data
    } else {
      const loadedIDs = new Set(notifications.value.map((notification) => notification.id))
      notifications.value.push(...result.data.filter((notification) => !loadedIDs.has(notification.id)))
    }
    hasUnread.value = result.hasUnread
    nextCursor.value = result.nextCursor
  } catch (error) {
    if (!request.signal.aborted) throw error
  } finally {
    if (listRequest === request) {
      listRequest = null
      loading.value = false
    }
  }
}

const handleLoadNotifications = useMessageHandle(loadNotifications, {
  en: 'Failed to load notifications',
  zh: '加载通知失败'
}).fn

function openNotificationCenter() {
  selectedNotificationID.value = null
  visible.value = true
  handleLoadNotifications(true)
}

async function handleOpenNotification(notification: notificationApis.UserNotification) {
  selectedNotificationID.value = notification.id
  if (notification.readAt != null || readRequests.has(notification.id)) return

  abortListRequest()
  const request = new AbortController()
  readRequests.set(notification.id, request)
  markingReadNotificationIDs.value.add(notification.id)
  try {
    const updated = await notificationApis.markUserNotificationRead(notification.id, request.signal)
    request.signal.throwIfAborted()
    const currentNotification = notifications.value.find((item) => item.id === notification.id) ?? null
    if (currentNotification != null && currentNotification.readAt == null && updated.readAt != null) {
      currentNotification.readAt = updated.readAt
      const lastNotification = notifications.value[notifications.value.length - 1] ?? null
      hasUnread.value =
        notifications.value.some((item) => item.readAt == null) ||
        (nextCursor.value != null && lastNotification?.readAt == null)
    }
  } catch {
    // Reading the notification succeeded; keep it unread so a later interaction can retry.
  } finally {
    if (readRequests.get(notification.id) === request) {
      readRequests.delete(notification.id)
      markingReadNotificationIDs.value.delete(notification.id)
    }
  }
}

function backToList() {
  selectedNotificationID.value = null
}

function isValidActionPath(value: string) {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return false
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0
    if (/\s/u.test(char) || codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) return false
  }
  return true
}

async function openAction() {
  const actionPath = selectedNotification.value?.actionPath
  if (actionPath == null || !isValidActionPath(actionPath)) return
  visible.value = false
  await router.push(actionPath)
}

const dateTimeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(i18n.lang.value === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
)

function formatTime(value: string) {
  return dateTimeFormatter.value.format(new Date(value))
}

watch(
  () => signedInUser.value?.id ?? null,
  (userID) => {
    abortListRequest()
    for (const request of readRequests.values()) request.abort()
    readRequests.clear()
    markingReadNotificationIDs.value.clear()
    notifications.value = []
    hasUnread.value = false
    nextCursor.value = null
    selectedNotificationID.value = null
    visible.value = false
    if (userID != null) handleLoadNotifications(true)
  },
  { immediate: true }
)

onUnmounted(() => {
  abortListRequest()
  for (const request of readRequests.values()) request.abort()
})
</script>

<template>
  <template v-if="signedInUser != null">
    <button
      v-radar="notificationRadar"
      :aria-label="notificationLabel"
      type="button"
      class="h-full cursor-pointer border-0 bg-transparent px-3 text-grey-900 hover:bg-grey-400 focus-visible:outline-primary-main"
      @click="openNotificationCenter"
    >
      <span class="relative flex size-5 items-center justify-center">
        <UIIcon type="bell" />
        <span
          v-if="hasUnread"
          class="absolute -top-0.5 -right-1 size-2 rounded-full bg-red-500 ring-2 ring-grey-100"
        ></span>
      </span>
    </button>

    <UIModal
      :visible="visible"
      size="small"
      class="w-[520px]"
      :radar="{
        name: $t({ en: 'Notification center', zh: '通知中心' }),
        desc: $t({ en: 'Persistent in-product notifications', zh: '持久化站内通知' })
      }"
      @update:visible="visible = $event"
    >
      <div class="flex items-center justify-between border-b border-grey-400 px-5 py-4">
        <div class="flex min-w-0 items-center gap-2">
          <UIButton
            v-if="selectedNotification != null"
            v-radar="{
              name: $t({ en: 'Back to notifications', zh: '返回通知列表' }),
              desc: $t({ en: 'Return to the notification list', zh: '返回通知列表' })
            }"
            :aria-label="$t({ en: 'Back to notifications', zh: '返回通知列表' })"
            type="white"
            shape="square"
            size="small"
            @click="backToList"
          >
            <template #icon>
              <UIIcon type="arrowRightSmall" class="rotate-180" />
            </template>
          </UIButton>
          <h2 class="truncate font-semibold text-title">
            {{ selectedNotification?.title ?? $t({ en: 'Notifications', zh: '通知' }) }}
          </h2>
        </div>
        <UIButton
          v-radar="{
            name: $t({ en: 'Close notifications', zh: '关闭通知' }),
            desc: $t({ en: 'Close the notification center', zh: '关闭通知中心' })
          }"
          :aria-label="$t({ en: 'Close notifications', zh: '关闭通知' })"
          type="white"
          shape="square"
          size="small"
          icon="close"
          @click="visible = false"
        />
      </div>

      <template v-if="selectedNotification == null">
        <div v-if="loading && notifications.length === 0" class="px-5 py-12 text-center text-sm text-grey-800">
          {{ $t({ en: 'Loading notifications...', zh: '正在加载通知...' }) }}
        </div>
        <div v-else-if="notifications.length === 0" class="px-5 py-12 text-center text-sm text-grey-800">
          {{ $t({ en: 'No notifications', zh: '暂无通知' }) }}
        </div>
        <div v-else class="max-h-[480px] overflow-y-auto">
          <button
            v-for="notification in notifications"
            :key="notification.id"
            v-radar="{
              name: notification.title,
              desc:
                notification.readAt == null
                  ? $t({ en: 'Open unread notification', zh: '打开未读通知' })
                  : $t({ en: 'Open notification', zh: '打开通知' })
            }"
            type="button"
            class="block w-full cursor-pointer border-x-0 border-t-0 border-b border-grey-300 px-5 py-4 text-left transition-colors last:border-b-0 focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-primary-main"
            :class="
              notification.readAt == null
                ? 'bg-primary-100/60 hover:bg-primary-200 active:bg-primary-300'
                : 'bg-transparent hover:bg-grey-200 active:bg-grey-300'
            "
            @click="handleOpenNotification(notification)"
          >
            <div class="flex items-start gap-3">
              <span
                class="mt-1.5 size-2 shrink-0 rounded-full"
                :class="notification.readAt == null ? 'bg-primary-main' : 'bg-transparent'"
              ></span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-3">
                  <span
                    class="truncate text-sm text-title"
                    :class="notification.readAt == null ? 'font-semibold' : 'font-normal'"
                  >
                    {{ notification.title }}
                  </span>
                  <time class="shrink-0 text-xs text-grey-800">{{ formatTime(notification.createdAt) }}</time>
                </div>
                <p class="mt-1 truncate text-sm text-grey-900">{{ notification.body }}</p>
              </div>
              <UIIcon type="arrowRightSmall" class="mt-1 size-4 shrink-0 text-grey-600" />
            </div>
          </button>
          <div v-if="nextCursor != null" class="border-t border-grey-300 p-3 text-center">
            <UIButton
              type="white"
              size="small"
              :loading="loading || markingReadNotificationIDs.size > 0"
              @click="handleLoadNotifications(false)"
            >
              {{ $t({ en: 'Load more', zh: '加载更多' }) }}
            </UIButton>
          </div>
        </div>
      </template>

      <article v-else class="max-h-[480px] overflow-y-auto px-5 py-5">
        <time class="text-xs text-grey-800">{{ formatTime(selectedNotification.createdAt) }}</time>
        <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-grey-1000">{{ selectedNotification.body }}</p>
        <UIButton v-if="selectedNotification.actionPath != null" class="mt-6" type="primary" @click="openAction">
          {{ $t({ en: 'View details', zh: '查看详情' }) }}
        </UIButton>
      </article>
    </UIModal>
  </template>
</template>
