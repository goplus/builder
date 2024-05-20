<template>
  <div class="project-list">
    <UIError v-if="isError && error">
      {{ error instanceof ActionException ? $t(error.userMessage) : error?.message }}
    </UIError>
    <UIEmpty v-if="data?.pages.length === 0 || data?.pages[0].data.length === 0" />
    <ul v-if="data" class="list">
      <template v-for="page in data?.pages">
        <ProjectItem
          v-for="project in page.data"
          :key="project.id"
          :in-homepage="inHomepage"
          :project-data="project"
          @click="() => emit('selected', project)"
          @removed="handleProjectRemoved(project)"
        />
      </template>
      <div ref="intersectTrigger" class="intersect-trigger" />
    </ul>
    <UILoading v-if="isPending || isFetchingNextPage" />
  </div>
</template>

<script lang="ts" setup>
import ProjectItem from './ProjectItem.vue'
import { listProject, type ProjectData } from '@/apis/project'
import { useInfiniteQuery, useQueryClient } from '@tanstack/vue-query'
import { UIEmpty, UIError, UILoading } from '../ui'
import { nextTick, ref, watchEffect } from 'vue'
import { ActionException } from '@/utils/exception'

defineProps<{
  inHomepage?: boolean
}>()

const emit = defineEmits<{
  selected: [ProjectData]
}>()

const intersectTrigger = ref<HTMLDivElement | null>(null)

const pageSize = 30
const { data, error, isError, isPending, isFetchingNextPage, fetchNextPage, hasNextPage } =
  useInfiniteQuery({
    queryKey: ['projects'],
    initialPageParam: 1,

    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await listProject({ pageSize, pageIndex: pageParam })
    },
    getNextPageParam: (lastPage, pages, lastPageParam) => {
      return pages.reduce((acc, page) => acc + page.data.length, 0) < lastPage.total
        ? lastPageParam + 1
        : undefined
    }
  })

const queryClient = useQueryClient()

watchEffect((onCleanup) => {
  if (!intersectTrigger.value) {
    return
  }

  const observer = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting && hasNextPage.value) {
      await fetchNextPage({
        // Will throw if another fetch is already in progress
        throwOnError: true
      })
      await nextTick()
      // Trigger the observer again to check if the content is enough to fill the viewport
      observer.unobserve(intersectTrigger.value!)
      observer.observe(intersectTrigger.value!)
    }
  })

  observer.observe(intersectTrigger.value)

  onCleanup(() => {
    observer.disconnect()
  })
})

const handleProjectRemoved = (project: ProjectData) => {
  if (!data.value) return
  const newPages = data.value.pages.map((page) => page.data.filter((p) => p.id !== project.id))
  queryClient.setQueryData(['projects'], {
    pages: newPages,
    pageParams: data?.value?.pageParams
  })
  queryClient.invalidateQueries({
    queryKey: ['projects']
  })
}
</script>

<style lang="scss" scoped>
.project-list {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  overflow-y: auto;
}
.list {
  flex: 1 1 0;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 20px;
  padding-bottom: 20px;
  position: relative;
}
.intersect-trigger {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 300px;
}
</style>
