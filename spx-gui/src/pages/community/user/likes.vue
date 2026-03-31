<script setup lang="ts">
import { computed } from 'vue'
import { useRouteQueryParamInt } from '@/utils/route'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { Visibility, listProject, ownerAll } from '@/apis/project'
import { useUser } from '@/stores/user'
import { UIPagination, useResponsive } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import UserContent from '@/components/community/user/content/UserContent.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'

const props = defineProps<{
  nameInput: string
}>()

const { data: user } = useUser(() => props.nameInput)
usePageTitle(() => {
  if (user.value == null) return null
  return {
    en: `Projects ${user.value.displayName} likes`,
    zh: `${user.value.displayName} 喜欢的项目`
  }
})

const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 5 : 4))
const pageSize = computed(() => numInRow.value * 2)
const page = useRouteQueryParamInt('p', 1)
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize.value))

const queryRet = useQuery(
  () =>
    listProject({
      visibility: Visibility.Public,
      owner: ownerAll,
      liker: props.nameInput,
      orderBy: 'likedAt',
      sortOrder: 'desc',
      pageSize: pageSize.value,
      pageIndex: page.value
    }),
  {
    en: 'Failed to load projects',
    zh: '加载失败'
  }
)
</script>

<template>
  <UserContent class="user-likes" :style="{ '--project-num-in-row': numInRow }">
    <template #title>
      {{ $t({ en: 'Projects I like', zh: '我喜欢的项目' }) }}
    </template>
    <div class="mt-2">
      <ListResultWrapper v-slot="slotProps" content-type="project" :query-ret="queryRet" :height="524">
        <ul class="grid grid-cols-[repeat(var(--project-num-in-row),minmax(0,1fr))] gap-middle">
          <ProjectItem v-for="project in slotProps.data.data" :key="project.id" :project="project" />
        </ul>
      </ListResultWrapper>
      <UIPagination v-show="pageTotal > 1" v-model:current="page" class="mt-9 mb-5 justify-center" :total="pageTotal" />
    </div>
  </UserContent>
</template>
