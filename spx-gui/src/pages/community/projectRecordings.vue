<template>
    <CenteredWrapper class="project-recordings-page">
      <!-- 面包屑导航 -->
      <div class="breadcrumb-section">
        <RouterUILink v-if="projectPageRoute" :to="projectPageRoute" class="back-link">
          <UIIcon type="arrowRightSmall" style="transform: rotate(180deg);" />
          {{ $t({ en: 'Back to project', zh: '返回项目' }) }}
        </RouterUILink>
      </div>
  
      <!-- 页面标题 -->
      <div class="header-section">
        <h1 class="page-title">
          {{ $t({ en: 'All Recordings', zh: '所有录屏' }) }}
        </h1>
        <p v-if="projectQuery.data.value" class="project-info">
          {{ projectQuery.data.value.name }}
          <span class="by-text">{{ $t({ en: 'by', zh: 'by' }) }}</span>
          <RouterUILink :to="getUserPageRoute(projectOwner)" class="owner-link">
            {{ projectOwner }}
          </RouterUILink>
        </p>
      </div>
  
      <!-- 筛选和排序 -->
      <div class="controls-section">
        <div class="sort-control">
          <span class="label">{{ $t({ en: 'Sort by:', zh: '排序：' }) }}</span>
          <UISelect v-model:value="orderValue">
            <UISelectOption :value="Order.RecentlyUpdated">
              {{ $t({ en: 'Recently updated', zh: '最近更新' }) }}
            </UISelectOption>
            <UISelectOption :value="Order.MostLikes">
              {{ $t({ en: 'Most likes', zh: '最多喜欢' }) }}
            </UISelectOption>
            <UISelectOption :value="Order.MostViews">
              {{ $t({ en: 'Most views', zh: '最多观看' }) }}
            </UISelectOption>
          </UISelect>
        </div>
        <div class="count-info">
          {{ $t({ 
            en: `${recordingsQueryRet.data.value?.total ?? 0} recordings`, 
            zh: `共 ${recordingsQueryRet.data.value?.total ?? 0} 个录屏` 
          }) }}
        </div>
      </div>
  
      <!-- Recordings列表 -->
      <div class="recordings-section" :style="{ '--recordings-per-row': numInRow }">
        <ListResultWrapper 
          v-slot="slotProps" 
          content-type="recording" 
          :query-ret="recordingsQueryRet" 
          :height="600"
        >
          <ul class="recordings-grid">
            <RecordingItem 
              v-for="recording in slotProps.data.data" 
              :key="recording.id" 
              context="public" 
              :recording="recording"
              @updated="handleRecordingUpdated"
              @removed="handleRecordingRemoved"
            />
          </ul>
        </ListResultWrapper>
      </div>
  
      <!-- 分页 -->
      <UIPagination 
        v-if="pageTotal > 1" 
        v-model:current="page" 
        class="pagination" 
        :total="pageTotal" 
      />
    </CenteredWrapper>
  </template>
  
  <script setup lang="ts">
  import { computed } from 'vue'
  import { useRouteQueryParamInt, useRouteQueryParamStrEnum } from '@/utils/route'
  import { useQuery } from '@/utils/query'
  import { usePageTitle } from '@/utils/utils'
  import { listRecording, type ListRecordingParams, type RecordingData } from '@/apis/recording'
  import { getProject, parseProjectFullName } from '@/apis/project'
  import { getProjectPageRoute, getUserPageRoute } from '@/router'
  import { UISelect, UISelectOption, UIPagination, UIIcon, useResponsive } from '@/components/ui'
  import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
  import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
  import RecordingItem from '@/components/recording/RecordingItem.vue'
  import RouterUILink from '@/components/common/RouterUILink.vue'
  
  const props = defineProps<{
    projectFullName: string
  }>()
  
  // 解析项目信息
  const projectInfo = computed(() => {
    try {
      return parseProjectFullName(props.projectFullName)
    } catch {
      return null
    }
  })
  
  const projectOwner = computed(() => projectInfo.value?.owner ?? '')
  const projectName = computed(() => projectInfo.value?.project ?? '')
  
  // 获取项目详情
  const projectQuery = useQuery(
    async () => {
      if (!projectInfo.value) return null
      return getProject(projectInfo.value.owner, projectInfo.value.project)
    },
    { en: 'Failed to load project', zh: '加载项目失败' }
  )
  
  // 页面标题
  const pageTitle = computed(() => {
    if (projectQuery.data.value) {
      return {
        en: `${projectQuery.data.value.name} - All Recordings`,
        zh: `${projectQuery.data.value.name} - 所有录屏`
      }
    }
    return {
      en: 'Project Recordings',
      zh: '项目录屏'
    }
  })
  
  usePageTitle(() => pageTitle.value)
  
  // 页面路由
  const projectPageRoute = computed(() => {
    if (!projectInfo.value) return ''
    return getProjectPageRoute(projectInfo.value.owner, projectInfo.value.project)
  })
  
  // 响应式布局
  const isDesktopLarge = useResponsive('desktop-large')
  const isMobile = useResponsive('mobile')
  const isTablet = useResponsive('tablet')
  const numInRow = computed(() => {
    if (isMobile.value) return 2
    if (isTablet.value) return 3
    return isDesktopLarge.value ? 5 : 4
  })
  
  // 分页和排序
  const pageSize = computed(() => numInRow.value * 3)
  const pageTotal = computed(() => Math.ceil((recordingsQueryRet.data.value?.total ?? 0) / pageSize.value))
  const page = useRouteQueryParamInt('p', 1)
  
  enum Order {
    RecentlyUpdated = 'update',
    MostLikes = 'likes',
    MostViews = 'views'
  }
  
  const orderRef = useRouteQueryParamStrEnum('o', Order, Order.RecentlyUpdated, (kvs) => ({
    ...kvs,
    p: null
  }))
  
  // 创建一个响应式的计算属性用于UISelect
  const orderValue = computed({
    get: () => orderRef.value ?? Order.RecentlyUpdated,
    set: (value: Order) => { orderRef.value = value }
  })
  
  // 查询参数中使用的order
  const order = computed(() => orderRef.value ?? Order.RecentlyUpdated)
  
  // 查询参数
  const listParams = computed<ListRecordingParams>(() => {
    const p: ListRecordingParams = {
      projectFullName: props.projectFullName,
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
      case Order.MostViews:
        p.orderBy = 'viewCount'
        p.sortOrder = 'desc'
        break
    }
    return p
  })
  
  // Recordings查询
  const recordingsQueryRet = useQuery(() => listRecording(listParams.value), {
    en: 'Failed to load recordings',
    zh: '加载录屏失败'
  })
  
  // 事件处理
  const handleRecordingUpdated = (updatedRecording: RecordingData) => {
    recordingsQueryRet.refetch()
  }
  
  const handleRecordingRemoved = () => {
    recordingsQueryRet.refetch()
  }
  </script>
  
  <style lang="scss" scoped>
  @import '@/components/ui/responsive.scss';
  
  .project-recordings-page {
    margin-top: 20px;
    padding-bottom: 40px;
  }
  
  .breadcrumb-section {
    margin-bottom: 20px;
  
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--ui-color-grey-600);
      text-decoration: none;
      font-size: 14px;
      transition: color 0.2s;
  
      &:hover {
        color: var(--ui-color-primary-main);
      }
    }
  }
  
  .header-section {
    margin-bottom: 24px;
  
    .page-title {
      font-size: 28px;
      font-weight: 700;
      color: var(--ui-color-title);
      margin: 0 0 8px 0;
      line-height: 1.2;
  
      @include responsive(mobile) {
        font-size: 24px;
      }
    }
  
    .project-info {
      font-size: 16px;
      color: var(--ui-color-grey-700);
      margin: 0;
  
      @include responsive(mobile) {
        font-size: 14px;
      }
  
      .by-text {
        color: var(--ui-color-grey-500);
        margin: 0 6px;
      }
  
      .owner-link {
        color: var(--ui-color-primary-main);
        text-decoration: none;
        font-weight: 500;
  
        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
  
  .controls-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 16px 20px;
    background: var(--ui-color-grey-50);
    border-radius: var(--ui-border-radius-2);
  
    @include responsive(mobile) {
      flex-direction: column;
      gap: 12px;
      padding: 12px 16px;
    }
  
    .sort-control {
      display: flex;
      align-items: center;
      gap: 12px;
  
      .label {
        font-size: 14px;
        color: var(--ui-color-grey-700);
        font-weight: 500;
      }
    }
  
    .count-info {
      font-size: 14px;
      color: var(--ui-color-grey-600);
      font-weight: 500;
    }
  }
  
  .recordings-section {
    margin-bottom: 32px;
  
    .recordings-grid {
      display: grid;
      grid-template-columns: repeat(var(--recordings-per-row), 1fr);
      gap: 20px;
  
      @include responsive(mobile) {
        gap: 16px;
      }
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