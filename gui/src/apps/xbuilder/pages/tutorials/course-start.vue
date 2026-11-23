<script setup lang="ts">
import { Cancelled } from '@/utils/exception'
import { composeQuery, useQuery, QueryMode } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { useCourse } from '@/stores/course'
import { useSeries } from '@/stores/course-series'
import { useSignedIn } from '@/stores/user'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import { useTutorial } from '@/components/tutorials/tutorial'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const tutorial = useTutorial()
const signedIn = useSignedIn()
const courseQueryRet = useCourse(() => props.courseIdInput, { mode: QueryMode.Snapshot })
const seriesQueryRet = useSeries(() => props.courseSeriesIdInput, { mode: QueryMode.Snapshot })

usePageTitle(() => {
  const title = courseQueryRet.data.value?.title
  const page = { en: 'Course', zh: '课程' }
  return title == null ? page : [{ en: title, zh: title }, page]
})

const allQueryRet = useQuery({
  queryFn: async (ctx) => {
    const [course, series] = await Promise.all([composeQuery(ctx, courseQueryRet), composeQuery(ctx, seriesQueryRet)])
    ctx.signal.throwIfAborted()
    if (!signedIn.isSignedIn) {
      await signedIn.signIn()
      throw new Cancelled('redirected to sign in')
    }
    await tutorial.enterCourse(course, series)
  },
  failureSummaryMessage: { en: 'Failed to start course', zh: '启动课程失败' }
})
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
