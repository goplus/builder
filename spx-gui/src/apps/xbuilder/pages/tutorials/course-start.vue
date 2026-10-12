<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

import { Cancelled, useMessageHandle } from '@/utils/exception'
import { composeQuery, useQuery } from '@/utils/query'
import { useCourse } from '@/stores/course'
import { useSeries } from '@/stores/course-series'
import { useSignIn, useSignedInStateQuery } from '@/stores/user'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UIDetailedLoading, UIError } from '@/components/ui'
import { getCourseSeriesPageRoute } from '@/apps/xbuilder/router'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const tutorial = useTutorial()
const route = useRoute()
const router = useRouter()
const { fn: signIn } = useMessageHandle(useSignIn(), { en: 'Failed to sign in', zh: '登录失败' })
const signedInStateQuery = useSignedInStateQuery()
const courseQueryRet = useCourse(() => props.courseIdInput)
const seriesQueryRet = useSeries(() => props.courseSeriesIdInput)

const allQueryRet = useQuery(
  async (ctx) => {
    const signedInState = await composeQuery(ctx, signedInStateQuery)
    ctx.signal.throwIfAborted()
    if (!signedInState.isSignedIn) {
      const destination = route.fullPath
      await router.replace(getCourseSeriesPageRoute(props.courseSeriesIdInput))
      await signIn(destination)
      throw new Cancelled('redirected to sign in')
    }
    const [course, series] = await Promise.all([composeQuery(ctx, courseQueryRet), composeQuery(ctx, seriesQueryRet)])
    ctx.signal.throwIfAborted()
    await tutorial.enterCourse(course, series)
  },
  { en: 'Failed to start course', zh: '启动课程失败' }
)
</script>

<template>
  <section class="h-full w-full flex items-center justify-center">
    <UIDetailedLoading v-if="allQueryRet.isLoading.value" :percentage="allQueryRet.progress.value.percentage">
      <span>{{ $t(allQueryRet.progress.value.desc ?? { zh: '跳转中...', en: 'Redirecting...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
      {{ $t(allQueryRet.error.value.userMessage) }}
    </UIError>
  </section>
</template>
