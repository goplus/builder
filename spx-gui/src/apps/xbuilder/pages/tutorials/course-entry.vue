<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router'

import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { composeQuery, useQuery } from '@/utils/query'
import { useSignIn, useSignedInStateQuery } from '@/stores/user'
import { UIConfirmDialog, UIError, UILoading, useModal } from '@/components/ui'
import { getCourseSeriesPageRoute } from '@/apps/xbuilder/router'

const props = defineProps<{
  courseSeriesIdInput: string
}>()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const signIn = useSignIn()
const confirmSignIn = useModal(UIConfirmDialog)
const signedInStateQuery = useSignedInStateQuery()

const { fn: requestSignIn } = useMessageHandle(
  async (signal: AbortSignal, destination: string) => {
    const seriesRoute = getCourseSeriesPageRoute(props.courseSeriesIdInput)
    const previousRoute = router.options.history.state.back
    const returnTo =
      typeof previousRoute === 'string' && router.resolve(previousRoute).path === seriesRoute
        ? previousRoute
        : seriesRoute

    try {
      await confirmSignIn(
        {
          title: t({ en: 'Sign in to continue', zh: '登录以继续' }),
          content: t({ en: 'You need to sign in before starting a course.', zh: '开始课程前需要先登录。' }),
          confirmText: t({ en: 'Sign in', zh: '登录' })
        },
        { signal }
      )
      signal.throwIfAborted()
    } finally {
      if (!signal.aborted) await router.replace(returnTo)
    }
    // Keep the list in browser history so Back from hosted sign-in also cancels Course entry.
    await signIn(destination, returnTo)
  },
  { en: 'Failed to sign in', zh: '登录失败' }
)

const entryQuery = useQuery(
  async (ctx) => {
    const destination = route.fullPath
    const state = await composeQuery(ctx, signedInStateQuery)
    ctx.signal.throwIfAborted()
    if (!state.isSignedIn) await requestSignIn(ctx.signal, destination)
  },
  { en: 'Failed to enter course', zh: '进入课程失败' }
)
</script>

<template>
  <RouterView v-if="signedInStateQuery.data.value?.isSignedIn === true" />
  <section v-else class="h-full w-full flex items-center justify-center">
    <UIError v-if="entryQuery.error.value != null" :retry="entryQuery.refetch">
      {{ $t(entryQuery.error.value.userMessage) }}
    </UIError>
    <UILoading v-else />
  </section>
</template>
