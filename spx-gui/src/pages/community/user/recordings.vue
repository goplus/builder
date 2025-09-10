<script setup lang="ts">
import { computed } from 'vue'
import { useRouteQueryParamInt, useRouteQueryParamStrEnum } from '@/utils/route'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { listRecording, type ListRecordingParams } from '@/apis/recording'
import { useUser } from '@/stores/user'
import { UISelect, UISelectOption, UIPagination, useResponsive } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import UserContent from '@/components/community/user/content/UserContent.vue'
import RecordingItem from '@/components/recording/RecordingItem.vue'

const props = defineProps<{
  name: string
}>()

const { data: user } = useUser(() => props.name)
usePageTitle(() => {
  if (user.value == null) return null
  return {
    en: `Recordings of ${user.value.displayName}`,
    zh: `${user.value.displayName} 的录屏`
  }
})

const isDesktopLarge = useResponsive('desktop-large')
const isMobile = useResponsive('mobile')
const numInRow = computed(() => {
  if (isMobile.value) return 2
  return isDesktopLarge.value ? 5 : 4
})
const pageSize = computed(() => numInRow.value * 2)
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize.value))
const page = useRouteQueryParamInt('p', 1)

enum Order {
  RecentlyUpdated = 'update',
  MostLikes = 'likes',
  MostViews = 'views'
}
const order = useRouteQueryParamStrEnum('o', Order, Order.RecentlyUpdated, (kvs) => ({
  ...kvs,
  p: null
}))

const listParams = computed<ListRecordingParams>(() => {
  const p: ListRecordingParams = {
    owner: props.name,
    pageSize: pageSize.value,
    pageIndex: page.value
  }

  switch (order.value) {
    case Order.RecentlyUpdated:
      p.orderBy = 'updatedAt'
      p.sortOrder = 'desc'
      break
    case Order.MostLikes:
      p.orderBy = 'likeCount'
      p.sortOrder = 'desc'
      break
    case Order.MostViews: // TODO:
      p.orderBy = 'viewCount'
      p.sortOrder = 'desc'
      break
  }
  return p
})

const queryRet = useQuery(() => listRecording(listParams.value), {
  en: 'Failed to load recordings',
  zh: '加载录屏失败'
})

const handleRecordingUpdated = () => {
  queryRet.refetch()
}
</script>

<template>
  <UserContent class="user-recordings" :style="{ '--project-num-in-row': numInRow }">
    <template #title>
      {{ $t({ en: 'My recordings', zh: '我的录屏' }) }}
    </template>
    <template #extra>
      <label class="sort">
        {{
          $t({
            en: 'Sort by',
            zh: '排序方式'
          })
        }}
        <UISelect v-model:value="order">
          <UISelectOption :value="Order.RecentlyUpdated">{{
            $t({
              en: 'Recently updated',
              zh: '最近更新'
            })
          }}</UISelectOption>
          <UISelectOption :value="Order.MostLikes">{{
            $t({
              en: 'Most likes',
              zh: '最受喜欢'
            })
          }}</UISelectOption>
          <UISelectOption :value="Order.MostViews">
            {{ $t({ en: 'Most views', zh: '最多观看' }) }}
          </UISelectOption>
        </UISelect>
      </label>
      <!-- <UIButton
        v-if="isSignedInUser && !isMobile"
        v-radar="{ name: 'New recording button', desc: 'Click to create a new recording' }"
        type="secondary"
        icon="plus"
        @click="handleNewProject"
      >
        {{ $t({ en: 'New recording', zh: '新建录屏' }) }}
      </UIButton> -->
    </template>
    <div class="recordings-wrapper">
      <ListResultWrapper v-slot="slotProps" content-type="recording" :query-ret="queryRet" :height="524">
        <ul class="recordings">
          <RecordingItem
            v-for="recording in slotProps.data.data"
            :key="recording.id"
            context="mine"
            :recording="recording"
            @removed="queryRet.refetch()"
            @updated="handleRecordingUpdated"
          />
        </ul>
      </ListResultWrapper>
      <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
    </div>
  </UserContent>
</template>

<style lang="scss" scoped>
@import '@/components/ui/responsive.scss';

.sort {
  display: flex;
  align-items: center;
  gap: 8px;

  @include responsive(mobile) {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

.recordings-wrapper {
  margin-top: 8px;

  @include responsive(mobile) {
    margin-top: 12px;
  }
}

.recordings {
  display: grid;
  grid-template-columns: repeat(var(--project-num-in-row), 1fr);
  gap: var(--ui-gap-middle);

  @include responsive(mobile) {
    gap: 16px;
  }
}

.pagination {
  margin: 36px 0 20px;
  justify-content: center;

  @include responsive(mobile) {
    margin: 24px 0 16px;
  }
}
</style>
