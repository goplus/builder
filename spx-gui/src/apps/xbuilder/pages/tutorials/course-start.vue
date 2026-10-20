<script setup lang="ts">
import { Cancelled } from '@/utils/exception'
import { composeQuery, untilLoaded, useQuery } from '@/utils/query'
import { useCourse } from '@/stores/course'
import { useSeries } from '@/stores/course-series'
import { useSignIn, useSignedInStateQuery } from '@/stores/user'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
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
      // Use untilLoaded instead of composeQuery to avoid restarting course entry on token refresh.
      // See https://github.com/goplus/builder/issues/3590
      untilLoaded(signedInStateQuery, ctx.signal),
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
  <section class="h-full w-full flex flex-col bg-grey-300">
    <header class="flex-none">
      <EditorNavbar :project="null" :state="null">
        <template #project-menu />
      </EditorNavbar>
    </header>
    <main class="flex-[1_1_0] flex items-center justify-center">
      <UIDetailedLoading v-if="allQueryRet.isLoading.value" :percentage="allQueryRet.progress.value.percentage">
        <span>{{ $t(allQueryRet.progress.value.desc ?? { zh: '跳转中...', en: 'Redirecting...' }) }}</span>
      </UIDetailedLoading>
      <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
        {{ $t(allQueryRet.error.value.userMessage) }}
      </UIError>
    </main>
  </section>
</template>
