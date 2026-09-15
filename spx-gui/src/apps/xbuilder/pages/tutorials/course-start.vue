<script setup lang="ts">
import { useTutorial } from '@/components/tutorials/tutorial'
import { UIDetailedLoading, UIError } from '@/components/ui'
import { useQuery } from '@/utils/query'

const props = defineProps<{
  courseSeriesIdInput: string
  courseIdInput: string
}>()

const tutorial = useTutorial()

const allQueryRet = useQuery(async () => tutorial.startCourse(props.courseSeriesIdInput, props.courseIdInput), {
  en: 'Failed to start course',
  zh: '启动课程失败'
})
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
