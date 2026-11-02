<script setup lang="ts">
/**
 * Course management: the author's course series, then the courses of one series. Each course belongs to exactly one
 * series, so courses are only reached, created and ordered through their series.
 */
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useSignedIn } from '@/stores/user'
import { useQuery } from '@/utils/query'
import { UIError, UILoading } from '@/components/ui'
import CenteredWrapper from '@/components/common/CenteredWrapper.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'

const route = useRoute()
const signedIn = useSignedIn()
const signedInUserQuery = useQuery(({ signal }) => signedIn.getUser({ signal }))

const canManageCourses = computed(() => signedIn.user?.capabilities.canManageCourses === true)

watch(
  () => signedIn.isSignedIn,
  async (isSignedIn) => {
    if (!isSignedIn) await signedIn.signIn(route.fullPath)
  },
  { immediate: true }
)
</script>

<template>
  <div class="h-full w-full flex flex-col overflow-y-auto bg-grey-300">
    <CommunityNavbar />
    <main class="flex-1">
      <div
        v-if="signedInUserQuery.isLoading.value || signedInUserQuery.data.value == null"
        class="h-full min-h-80 flex items-center justify-center"
      >
        <UIError v-if="signedInUserQuery.error.value != null">
          {{ $t(signedInUserQuery.error.value.userMessage) }}
        </UIError>
        <UILoading v-else />
      </div>
      <UIError v-else-if="!canManageCourses" class="h-full min-h-80">
        {{ $t({ en: 'Access denied', zh: '没有访问权限' }) }}
        <template #sub-message>
          {{
            $t({
              en: 'This page is only available to course managers.',
              zh: '此页面仅对课程管理员开放。'
            })
          }}
        </template>
      </UIError>
      <CenteredWrapper v-else class="py-8">
        <RouterView />
      </CenteredWrapper>
    </main>
  </div>
</template>
