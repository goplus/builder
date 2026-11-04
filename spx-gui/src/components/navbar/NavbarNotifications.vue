<script setup lang="ts">
import { computed, ref } from 'vue'

import { NotificationCategory } from '@/apis/notification'
import { useUnreadNotificationCount } from '@/stores/notification'
import { UIDropdown, UIIcon, UITooltip } from '@/components/ui'
import NotificationPanel from '@/components/notification/NotificationPanel.vue'

const messageUnreadCount = useUnreadNotificationCount(NotificationCategory.Message)
const announcementUnreadCount = useUnreadNotificationCount(NotificationCategory.Announcement)
const unreadCount = computed(() => (messageUnreadCount.data.value ?? 0) + (announcementUnreadCount.data.value ?? 0))

const panelVisible = ref(false)
</script>

<template>
  <UIDropdown
    v-model:visible="panelVisible"
    trigger="manual"
    placement="bottom-end"
    class="rounded-lg bg-white shadow-lg"
  >
    <template #trigger>
      <UITooltip placement="bottom" :disabled="panelVisible">
        <template #trigger>
          <button
            v-radar="{
              name: 'Notifications',
              desc: unreadCount === 0 ? 'Open notifications' : `Open notifications, ${unreadCount} unread`
            }"
            type="button"
            aria-haspopup="dialog"
            :aria-expanded="panelVisible"
            class="h-full cursor-pointer border-0 bg-transparent px-3 text-grey-1000 hover:bg-grey-400 focus-visible:outline-primary-main"
            @click="panelVisible = !panelVisible"
          >
            <span class="relative flex size-9 items-center justify-center">
              <UIIcon type="notification" class="size-5" />
              <span
                v-if="unreadCount > 0"
                aria-hidden="true"
                class="absolute right-2 top-2 size-2 rounded-full bg-red-main ring-2 ring-white"
              ></span>
            </span>
          </button>
        </template>
        {{ $t({ en: 'Notifications', zh: '通知' }) }}
      </UITooltip>
    </template>
    <NotificationPanel />
  </UIDropdown>
</template>
