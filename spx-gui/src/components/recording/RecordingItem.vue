<template>
  <li class="recording-item" :class="{ [context]: true }">
    <!-- 右上角操作按钮 -->
    <UIDropdown v-if="context !== 'public' && isOwner && operatable" trigger="click" placement="bottom-end">
      <template #trigger>
        <div
v-radar="{
          name: 'Recording item operations',
          desc: 'More operations (edit, remove) for recording item, click to open the menu'
        }" class="options" @click.stop.prevent>
          <UIIcon class="icon" type="more" />
        </div>
      </template>
      <UIMenu>
        <UIMenuItem v-radar="{ name: 'Edit option', desc: 'Click to edit the recording' }" @click="handleEdit.fn">
          {{ $t({ en: 'Edit', zh: '编辑' }) }}
        </UIMenuItem>
        <UIMenuItem v-radar="{ name: 'Remove option', desc: 'Click to remove the recording' }" @click="handleRemove">
          {{ $t({ en: 'Remove', zh: '删除' }) }}
        </UIMenuItem>
      </UIMenu>
    </UIDropdown>
    <RouterLink :to="to" class="link" @click="$emit('selected')">
      <div class="media">
        <div class="thumbnail">
          <UIImg :src="thumbnailUrl" :alt="recording.title" />

        </div>
        <div v-if="shouldShowAvatar" class="owner-avatar-wrapper">
          <svg
class="avatar-bg" xmlns="http://www.w3.org/2000/svg" width="67" height="31" viewBox="0 0 67 31"
            fill="none">
            <path
              d="M48.67 11.94C43.36 6.71 39.42 0 29.3 0H28.7C18.58 0 14.64 6.71 9.33 11.94C5.47 16.76 -2.39 17.81 -9 18V31H67V18C60.39 17.81 52.53 16.76 48.67 11.94Z"
              fill="white" />
          </svg>
          <UserAvatar
v-radar="{ name: 'Recording owner avatar', desc: 'Click to view profile of recording owner' }"
            class="owner-avatar" size="small" :user="recording.owner" />
        </div>
      </div>
      <div class="info">
        <p class="description" :title="recording.description">{{ recording.description }}</p>
        <p class="others">
          <span class="part" :class="{ liking }" :title="$t(likesTitle)">
            <UIIcon class="icon" type="heart" />
            {{ $t(humanizeCount(recording.likeCount)) }}
          </span>
          <span class="part">
            <UIIcon class="icon" type="eye" />
            {{ $t(humanizeCount(recording.viewCount)) }}
          </span>
          <span class="part time" :title="$t(timeTitle)">
            {{ $t(humanizeTime(recording.updatedAt)) }}
          </span>
        </p>
      </div>
    </RouterLink>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { humanizeCount, humanizeExactCount, humanizeTime, humanizeExactTime, useAsyncComputed } from '@/utils/utils'
import { getRecordingPageRoute } from '@/router'
import { type RecordingData } from '@/apis/recording'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { getSignedInUsername } from '@/stores/user'
import { UIImg, UIDropdown, UIIcon, UIMenu, UIMenuItem } from '@/components/ui'
import UserAvatar from '@/components/community/user/UserAvatar.vue'
import { useEditRecording, useRemoveRecording } from '.'

type Context = 'public' | 'mine'

const props = withDefaults(
  defineProps<{
    recording: RecordingData
    context?: Context
  }>(),
  {
    context: 'public'
  }
)

const emit = defineEmits<{
  selected: []
  removed: []
  updated: [updatedRecording: RecordingData]  
}>()

const isOwner = computed(() => props.recording.owner === getSignedInUsername())
const operatable = computed(() => props.context === 'mine' && isOwner.value)

const shouldShowAvatar = computed(() => {
  // 如果是public context，总是显示头像
  if (props.context === 'public') return true

  // 如果是mine context，但recording不是当前用户的，也显示头像（用于查看喜欢的recordings）
  if (props.context === 'mine' && props.recording.owner !== getSignedInUsername()) return true

  // 其他情况不显示头像（自己的recordings）
  return false
})

const to = computed(() => {
  return getRecordingPageRoute(props.recording.id)
})

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnailUniversalUrl = props.recording.thumbnailUrl
  if (thumbnailUniversalUrl === '') return null
  const thumbnail = createFileWithUniversalUrl(thumbnailUniversalUrl)
  return thumbnail.url(onCleanup)
})

const liking = computed(() => {
  return props.recording.likeCount > 0
})

const likesTitle = computed(() => {
  const count = humanizeExactCount(props.recording.likeCount)
  return {
    en: `Liked by ${count.en} users`,
    zh: `${count.zh} 个用户喜欢`
  }
})

const timeTitle = computed(() => {
  const fullTime = humanizeExactTime(props.recording.updatedAt)
  return {
    en: `Last updated at ${fullTime.en}`,
    zh: `最后更新于 ${fullTime.zh}`
  }
})

// 在script setup中添加
const editRecording = useEditRecording()

// 修改handleEdit函数
const handleEdit = useMessageHandle(
  async () => {
    const updatedRecording = await editRecording(props.recording)  // 这会打开模态框
    emit('updated', updatedRecording)  // 通知父组件
    return updatedRecording
  },
  { en: 'Failed to edit recording', zh: '编辑录屏失败' }
)

const removeRecording = useRemoveRecording()
const handleRemove = useMessageHandle(
  async () => {
    await removeRecording(props.recording.id, props.recording.title)
    emit('removed')
  },
  { en: 'Failed to remove recording', zh: '删除录屏失败' },
  { en: 'Recording removed successfully', zh: '录屏删除成功' }
).fn

</script>

<style lang="scss" scoped>
@import '@/utils/utils';
@import '@/components/ui/responsive.scss';

.recording-item {
  width: 232px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: var(--ui-border-radius-2);
  border: 1px solid var(--ui-color-grey-400);
  background-color: var(--ui-color-grey-100);
  transition: 0.1s;

  @include responsive(mobile) {
    width: 100%;
    aspect-ratio: 230/280;
    font-size: 14px;
  }

  &:hover {
    .options {
      opacity: 1;
      visibility: visible;
    }
  }
}

.options {
  opacity: 0;
  visibility: hidden;
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  color: var(--ui-color-grey-800);
  background-color: var(--ui-color-grey-100);
  cursor: pointer;
  transition: 0.1s;
  z-index: 10;

  // 移动端调整操作按钮大小
  @include responsive(mobile) {
    width: 28px;
    height: 28px;
    top: 6px;
    right: 6px;
  }

  &:hover {
    color: var(--ui-color-grey-100);
    background-color: var(--ui-color-primary-main);
  }

  .icon {
    width: 21px;
    height: 21px;

    // 移动端调整图标大小
    @include responsive(mobile) {
      width: 18px;
      height: 18px;
    }
  }
}

.link {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit;
  text-decoration: none;

  &:hover {
    color: inherit;
    text-decoration: none;
  }
}

.media {
  position: relative;
  width: 100%;
  aspect-ratio: 230/171;
  overflow: visible;
  background-color: var(--ui-color-grey-300);

  .thumbnail {
    position: relative;
    width: 100%;
    height: 100%;

    :deep(.ui-img) {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .duration-badge {
    position: absolute;
    bottom: 6px;
    right: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 12px;
    font-weight: 500;

    @include responsive(mobile) {
      font-size: 0.86em;
      padding: 0.14em 0.43em;
    }

    // 加载状态样式
    &.loading {
      opacity: 0.6;
    }
  }


  .owner-avatar-wrapper {
    position: absolute;
    bottom: -9px;
    left: 0;
    width: 100%;
    height: 13px;
    background-color: var(--ui-color-grey-100);

    .avatar-bg {
      position: absolute;
      bottom: 0;
      left: 0;
    }

    .owner-avatar {
      position: absolute;
      bottom: -2px;
      left: 14px;
    }
  }
}

.info {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 15px 12px 12px 12px;
  gap: 8px;

  @include responsive(mobile) {
    padding: 0.86em;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;

    .more-btn {
      flex: 0 0 auto;
      padding: 2px;
      border-radius: 4px;
      cursor: pointer;
      color: var(--ui-color-grey-600);

      &:hover {
        background-color: var(--ui-color-grey-200);
        color: var(--ui-color-grey-800);
      }
    }

    .icon {
      flex: 0 0 auto;
      margin-left: 4px;
      width: 16px;
      height: 16px;
    }
  }

  .description {
    font-size: 14px;
    color: var(--ui-color-grey-600);
    // line-height: 1.4;

    // 单行省略号样式
    white-space: nowrap; // 强制单行显示
    overflow: hidden; // 隐藏超出部分
    text-overflow: ellipsis; // 显示省略号

    @include responsive(mobile) {
      font-size: 0.86em;
      line-height: 1.4em;
    }
  }

  .others {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: auto;
    font-size: 13px; // ← 改为与 ProjectItem 相同
    line-height: 20px; // ← 添加行高设置
    color: var(--ui-color-grey-700);

    @include responsive(mobile) {
      gap: 0.57em;
      font-size: 0.86em;
    }

    .part {
      display: flex;
      align-items: center;
      gap: 3px;

      @include responsive(mobile) {
        gap: 0.21em;
      }

      .icon {
        width: 14px;
        height: 14px;

        @include responsive(mobile) {
          width: 0.86em;
          height: 0.86em;
        }
      }

      &.liking {
        color: var(--ui-color-red-main);

        .icon {
          color: var(--ui-color-red-main); 
        }
      }

      &.time {
        margin-left: auto;
      }
    }
  }
}

.recording-item {
  position: relative; // 确保定位上下文

  // 默认隐藏操作按钮
  .corner-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transform: translateY(-4px);
    transition: all 0.2s;
    z-index: 10;
  }

  // 悬停时显示
  &:hover {
    .corner-actions {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>