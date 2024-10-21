<script setup lang="ts">
import { useQuery } from '@/utils/exception'
import { humanizeTime } from '@/utils/utils'
import { listReleases } from '@/apis/project-release'
import { UITimeline, UITimelineItem, UILoading, UIError } from '@/components/ui'

const props = defineProps<{
  owner: string
  name: string
}>()

const {
  data: releases,
  isLoading,
  error,
  refetch
} = useQuery(
  async () => {
    const { owner, name } = props
    const { data } = await listReleases({
      projectFullName: `${owner}/${name}`,
      orderBy: 'createdAt',
      sortOrder: 'desc',
      pageIndex: 1,
      pageSize: 10 // load at most 10 recent releases
    })
    return data
  },
  { en: 'Load release history failed', zh: '加载发布历史失败' }
)

defineExpose({
  refetch
})
</script>

<template>
  <UILoading v-if="isLoading" />
  <UIError v-else-if="error != null" :retry="refetch">
    {{ $t(error.userMessage) }}
  </UIError>
  <p v-else-if="releases?.length === 0">
    {{ $t({ en: 'No release history yet', zh: '暂无发布历史' }) }}
  </p>
  <UITimeline v-else-if="releases != null">
    <UITimelineItem
      v-for="release in releases"
      :key="release.id"
      :time="$t(humanizeTime(release.createdAt))"
    >
      {{ release.description }}
    </UITimelineItem>
  </UITimeline>
</template>

<style lang="scss" scoped></style>
