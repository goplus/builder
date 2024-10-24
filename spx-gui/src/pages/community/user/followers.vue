<script setup lang="ts">
import { computed } from 'vue'
import { useRouteQueryParamInt } from '@/utils/route'
import { useQuery } from '@/utils/exception'
import { listUsers } from '@/apis/user'
import { UIPagination } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import UserContent from '@/components/community/user/content/UserContent.vue'
import UserItem from '@/components/community/user/UserItem.vue'

const props = defineProps<{
  name: string
}>()

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
        <UserItem v-for="user in slotProps.data.data" :key="user.id" :user="user" />
      </ul>
    </ListResultWrapper>
    <UIPagination
      v-show="pageTotal > 1"
      v-model:current="page"
      class="pagination"
      :total="pageTotal"
    />
  </UserContent>
</template>

<style lang="scss" scoped>
.pagination {
  margin: 36px 0 20px;
  justify-content: center;
}
</style>
