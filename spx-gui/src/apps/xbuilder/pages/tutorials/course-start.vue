<script setup lang="ts">
import { Cancelled } from '@/utils/exception'
import { composeQuery, useQuery } from '@/utils/query'
import { useCourse } from '@/stores/course'
import { useSeries } from '@/stores/course-series'
import { useSignIn, useSignedInStateQuery } from '@/stores/user'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const tutorial = useTutorial()
const signIn = useSignIn()
const signedInStateQuery = useSignedInStateQuery()
const courseQueryRet = useCourse(() => props.courseIdInput)
const seriesQueryRet = useSeries(() => props.courseSeriesIdInput)

const allQueryRet = useQuery(
  async (ctx) => {
    const [signedInState, course, series] = await Promise.all([
      composeQuery(ctx, signedInStateQuery),
      composeQuery(ctx, courseQueryRet),
      composeQuery(ctx, seriesQueryRet)
    ])
    ctx.signal.throwIfAborted()
    if (!signedInState.isSignedIn) {
      await signIn()
      throw new Cancelled('redirected to sign in')
    }
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
