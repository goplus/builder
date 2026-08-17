<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { UIIcon } from '@/components/ui'
import { useFeedbackDemoModel } from '@/components/feedback-demo/model'
import { useI18n } from '@/utils/i18n'

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
    <span class="relative flex size-5 items-center justify-center">
      <UIIcon type="bell" />
      <span
        v-if="feedbackDemo.unreadNotificationCount.value > 0"
        class="absolute -top-1 -right-1 size-2 rounded-full bg-red-500 ring-2 ring-grey-100"
      ></span>
    </span>
  </button>
</template>
