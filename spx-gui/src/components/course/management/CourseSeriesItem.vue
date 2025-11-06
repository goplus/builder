<script lang="ts" setup>
import type { CourseSeries } from '@/apis/course-series'
import { useAsyncComputed } from '@/utils/utils'
import { createFileWithWebUrl } from '@/models/common/cloud'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  courseSeries: CourseSeries
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  if (props.courseSeries.thumbnail === '' || props.courseSeries.thumbnail == null) return null
  const file = createFileWithWebUrl(props.courseSeries.thumbnail)
  return file.url(onCleanup)
})
</script>

<template>
  <li class="course-series-item">
    <UIImg v-if="thumbnailUrl != null" class="thumbnail" :src="thumbnailUrl" size="cover" />
    <div class="content" :class="{ 'has-thumbnail': thumbnailUrl != null }">
      <div class="order">{{ courseSeries.order }}</div>
      <h3 class="title" :title="courseSeries.title">{{ courseSeries.title }}</h3>
      <div class="course-count">
        {{
          $t({
            en: `${courseSeries.courseIDs.length} course${courseSeries.courseIDs.length !== 1 ? 's' : ''}`,
            zh: `${courseSeries.courseIDs.length} 个课程`
          })
        }}
      </div>
    </div>

    <div class="action-section">
      <slot />
    </div>
  </li>
</template>

<style lang="scss" scoped>
.course-series-item {
  position: relative;
  width: 232px;
  height: 160px;
  border-radius: var(--ui-border-radius-3);
  background: var(--ui-color-grey-50);
  border: 2px solid var(--ui-color-grey-300);
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;

  &:hover {
    border-color: var(--ui-color-grey-400);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

    .action-section :deep(.corner-menu) {
      visibility: visible;
      opacity: 1;
    }
  }
}

.thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  text-align: center;

  &.has-thumbnail {
    .title {
      color: var(--ui-color-grey-100);
    }

    .order {
      color: var(--ui-color-grey-100);
    }

    .course-count {
      color: var(--ui-color-grey-400);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
  }
}

.order {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 28px;
  height: 28px;
  color: var(--ui-color-grey-900);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.title {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--ui-color-grey-900);
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  line-height: 1.4;
  width: 100%;
  word-break: break-word;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.course-count {
  color: var(--ui-color-grey-600);
}

.action-section {
  position: absolute;
  top: 8px;
  right: 8px;

  :deep(.corner-menu) {
    opacity: 0;
    visibility: hidden;
    transition: 0.1s;
  }
}
</style>
