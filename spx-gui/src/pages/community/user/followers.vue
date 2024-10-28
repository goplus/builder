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
  name: string
}>()

const { data: user } = useUser(() => props.name)
usePageTitle(() => {
  if (user.value == null) return null
  return {
    en: `Followers of ${user.value.displayName}`,
    zh: `${user.value.displayName} 的关注者`
  }
})

const pageSize = 8
const page = useRouteQueryParamInt('p', 1)
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))

const queryRet = useQuery(
  () =>
    listUsers({
      followee: props.name,
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
      {{ $t({ en: 'My followers', zh: '我的关注者' }) }}
    </template>
    <ListResultWrapper v-slot="slotProps" :query-ret="queryRet" :height="496">
      <ul class="users">
        <UserItem v-for="u in slotProps.data.data" :key="u.id" :user="u" />
      </ul>
    </ListResultWrapper>
    <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
  </UserContent>
</template>

<style lang="scss" scoped>
.pagination {
  margin: 36px 0 20px;
  justify-content: center;
}
</style>
