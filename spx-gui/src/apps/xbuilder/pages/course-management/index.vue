<script setup lang="ts">
/**
 * Course management: the author's course series, then the courses of one series. Each course belongs to exactly one
 * series, so courses are only reached, created and ordered through their series.
 */
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useSignIn, useSignedInStateQuery } from '@/stores/user'
import { UIError, UILoading } from '@/components/ui'
import CenteredWrapper from '@/components/common/CenteredWrapper.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'

const route = useRoute()
const signIn = useSignIn()
const signedInStateQuery = useSignedInStateQuery()

const signedInState = computed(() => signedInStateQuery.data.value)
const canManageCourses = computed(() => signedInState.value?.user?.capabilities.canManageCourses === true)

watch(
  signedInState,
  async (state) => {
    if (state != null && !state.isSignedIn) await signIn(route.fullPath)
  },
  { immediate: true }
)
</script>

<template>
  <div class="h-full w-full flex flex-col overflow-y-auto bg-grey-300">
    <CommunityNavbar />
    <main class="flex-1">
      <div
        v-if="signedInState == null || !signedInState.isSignedIn"
        class="h-full min-h-80 flex items-center justify-center"
      >
        <UIError v-if="signedInStateQuery.error.value != null">
          {{ $t(signedInStateQuery.error.value.userMessage) }}
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
