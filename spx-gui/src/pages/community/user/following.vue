<script setup lang="ts">
import { computed } from 'vue'
import { useRouteQueryParamInt } from '@/utils/route'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { listUsers } from '@/apis/user'
import { useUser } from '@/stores/user'
import { UIPagination } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import UserContent from '@/components/community/user/content/UserContent.vue'
import UserItem from '@/components/community/user/UserItem.vue'

const props = defineProps<{
  nameInput: string
}>()

const { data: user } = useUser(() => props.nameInput)
usePageTitle(() => {
  if (user.value == null) return null
  return {
    en: `${user.value.displayName} is following`,
    zh: `${user.value.displayName} 关注的用户`
  }
})

const pageSize = 8
const page = useRouteQueryParamInt('p', 1)
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))

const queryRet = useQuery(
  () =>
    listUsers({
      follower: props.nameInput,
      orderBy: 'followedAt',
      sortOrder: 'desc',
      pageSize,
      pageIndex: page.value
    }),
  {
    en: 'Failed to load users',
    zh: '加载失败'
  }
)
</script>

<template>
  <UserContent class="user-likes">
    <template #title>
      {{ $t({ en: "Users I'm following", zh: '我关注的用户' }) }}
    </template>
    <ListResultWrapper v-slot="slotProps" :query-ret="queryRet" :height="496">
      <ul class="users">
        <UserItem v-for="u in slotProps.data.data" :key="u.id" :user="u" />
      </ul>
    </ListResultWrapper>
    <UIPagination v-show="pageTotal > 1" v-model:current="page" class="mt-9 mb-5 justify-center" :total="pageTotal" />
  </UserContent>
</template>
