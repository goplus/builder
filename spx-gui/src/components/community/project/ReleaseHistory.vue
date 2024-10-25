<script setup lang="ts">
import { type QueryRet } from '@/utils/query'
import { humanizeTime } from '@/utils/utils'
import { type ProjectRelease } from '@/apis/project-release'
import { UITimeline, UITimelineItem, UILoading, UIError } from '@/components/ui'

defineProps<{
  queryRet: QueryRet<ProjectRelease[]>
}>()
</script>

<template>
  <UILoading v-if="queryRet.isLoading.value" />
  <UIError v-else-if="queryRet.error.value != null" :retry="queryRet.refetch">
    {{ $t(queryRet.error.value.userMessage) }}
  </UIError>
  <p v-else-if="queryRet.data.value?.length === 0">
    {{ $t({ en: 'No release history yet', zh: '暂无发布历史' }) }}
  </p>
  <UITimeline v-else-if="queryRet.data.value != null">
    <UITimelineItem
      v-for="release in queryRet.data.value"
      :key="release.id"
      :time="$t(humanizeTime(release.createdAt))"
    >
      {{ release.description }}
    </UITimelineItem>
  </UITimeline>
</template>

<style lang="scss" scoped></style>
