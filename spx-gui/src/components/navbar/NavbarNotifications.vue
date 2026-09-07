<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useFeedbackDemoModel } from '@/components/feedback-demo/model'
import { useI18n } from '@/utils/i18n'
import notificationIcon from '@/components/ui/icons/notification-feedback.svg'

const route = useRoute()
const feedbackDemo = useFeedbackDemoModel()
const { t } = useI18n()
const notificationLabel = computed(() => {
  const unreadCount = feedbackDemo.unreadNotificationCount.value
  if (unreadCount === 0) return t({ en: 'Notifications', zh: '通知' })
  return t({
    en: `Notifications, ${unreadCount} unread`,
    zh: `通知，${unreadCount} 条未读`
  })
})
const notificationRadar = computed(() => ({
  name: 'Notifications',
  desc:
    feedbackDemo.unreadNotificationCount.value === 0
      ? 'Open notifications'
      : `Open notifications. ${feedbackDemo.unreadNotificationCount.value} unread.`
}))
</script>

<template>
  <button
    v-if="!route.path.startsWith('/admin')"
    v-radar="notificationRadar"
    :aria-label="notificationLabel"
    type="button"
    class="h-full cursor-pointer border-0 bg-transparent px-3 text-grey-900 hover:bg-grey-400 focus-visible:outline-primary-main"
    @click="feedbackDemo.openNotificationCenter"
  >
    <span class="relative flex size-9 items-center justify-center">
      <img class="size-5" :src="notificationIcon" alt="" aria-hidden="true" />
      <span
        v-if="feedbackDemo.unreadNotificationCount.value > 0"
        aria-hidden="true"
        class="absolute right-2 top-2 size-2 rounded-full bg-[#ef4149] ring-2 ring-white"
      ></span>
    </span>
  </button>
</template>
