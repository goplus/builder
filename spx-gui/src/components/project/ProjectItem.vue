<template>
  <li class="project-item">
    <RouterLink class="link" :to="to" @click="emit('selected')">
      <div class="thumbnail-wrapper">
        <UIImg class="thumbnail" :src="thumbnailUrl" />
        <UIDropdown v-if="context === 'mine' && isOwner" trigger="click" placement="bottom-end">
          <template #trigger>
            <div class="options" @click.stop.prevent>
              <UIIcon class="icon" type="more" />
            </div>
          </template>
          <UIMenu>
            <UIMenuItem @click="handleEdit">
              {{ $t({ en: 'Edit', zh: '编辑' }) }}
            </UIMenuItem>
            <UIMenuItem @click="handleRemove">
              {{ $t({ en: 'Remove', zh: '删除' }) }}
            </UIMenuItem>
          </UIMenu>
        </UIDropdown>
        <div v-if="context === 'public'" class="owner-avatar-wrapper">
          <svg
            class="avatar-bg"
            xmlns="http://www.w3.org/2000/svg"
            width="67"
            height="31"
            viewBox="0 0 67 31"
            fill="none"
          >
            <path
              d="M48.67 11.94C43.36 6.71 39.42 0 29.3 0H28.7C18.58 0 14.64 6.71 9.33 11.94C5.47 16.76 -2.39 17.81 -9 18V31H67V18C60.39 17.81 52.53 16.76 48.67 11.94Z"
              fill="white"
            />
          </svg>
          <UserAvatar class="owner-avatar" size="small" :user="project.owner" />
        </div>
      </div>
      <div class="info">
        <div class="header">
          <h5 class="name" :title="project.name">{{ project.name }}</h5>
          <template v-if="context !== 'public' && isOwner">
            <i v-if="project.visibility === Visibility.Public" class="public" :title="$t({ en: 'Public', zh: '公开' })">
              <UIIcon class="icon" type="statePublic" />
            </i>
            <i v-else class="private" :title="$t({ en: 'Private', zh: '私有' })">
              <UIIcon class="icon" type="statePrivate" />
            </i>
          </template>
        </div>
        <p class="others">
          <span class="part" :class="{ liking }" :title="$t(likesTitle)">
            <UIIcon type="heart" />
            {{ $t(humanizeCount(project.likeCount)) }}
          </span>
          <span class="part time" :title="$t(timeTitle)">
            {{ $t(humanizeTime(project.updatedAt)) }}
          </span>
        </p>
      </div>
    </RouterLink>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageHandle } from '@/utils/exception'
import { humanizeCount, humanizeExactCount, humanizeTime, humanizeExactTime, useAsyncComputed } from '@/utils/utils'
import { getProjectEditorRoute, getProjectPageRoute } from '@/router'
import { Visibility, type ProjectData } from '@/apis/project'
import { universalUrlToWebUrl } from '@/models/common/cloud'
import { useUserStore } from '@/stores/user'
import { useIsLikingProject } from '@/stores/liking'
import { UIImg, UIDropdown, UIIcon, UIMenu, UIMenuItem } from '@/components/ui'
import UserAvatar from '@/components/community/user/UserAvatar.vue'
import { useRemoveProject } from '.'

/**
 * Context (list) where the project item is used
 * - `public`: List of public projects from all users
 * - `mine`: List of "my projects"
 * - `edit`: List of "my projects" to edit
 */
type Context = 'public' | 'mine' | 'edit'

const props = withDefaults(
  defineProps<{
    project: ProjectData
    /** Context (list) where the project item is used */
    context?: Context
  }>(),
  {
    context: 'public'
  }
)

const emit = defineEmits<{
  selected: []
  removed: []
}>()

const userStore = useUserStore()
const isOwner = computed(() => props.project.owner === userStore.getSignedInUser()?.name)

const router = useRouter()

const to = computed(() => {
  const { owner, name } = props.project
  return props.context === 'edit' ? getProjectEditorRoute(name) : getProjectPageRoute(owner, name)
})

const thumbnailUrl = useAsyncComputed(async () => {
  if (props.project.thumbnail === '') return null
  return universalUrlToWebUrl(props.project.thumbnail)
})

const { data: liking } = useIsLikingProject(() => ({
  owner: props.project.owner,
  name: props.project.name
}))

const likesTitle = computed(() => {
  const count = humanizeExactCount(props.project.likeCount)
  return {
    en: `Liked by ${count.en} users`,
    zh: `${count.zh} 个用户喜欢`
  }
})

const timeTitle = computed(() => {
  const fullTime = humanizeExactTime(props.project.updatedAt)
  return {
    en: `Last updated at ${fullTime.en}`,
    zh: `最后更新于 ${fullTime.zh}`
  }
})

function handleEdit() {
  router.push(getProjectEditorRoute(props.project.name))
}

const removeProject = useRemoveProject()
const handleRemove = useMessageHandle(
  async () => {
    const { owner, name } = props.project
    await removeProject(owner, name)
    emit('removed')
  },
  { en: 'Failed to remove project', zh: '删除项目失败' }
).fn
</script>

<style lang="scss" scoped>
@import '@/utils/utils';

.project-item {
  width: 232px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: var(--ui-border-radius-2);
  border: 1px solid var(--ui-color-grey-400);
  background-color: var(--ui-color-grey-100);
  transition: 0.1s;
}

.link {
  text-decoration: none;
}

.thumbnail-wrapper {
  position: relative;
  aspect-ratio: 4 / 3;
  background-position: center;
  background-size: contain;
  background-image: url(./bg.svg);

  .thumbnail {
    width: 100%;
    height: 100%;
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

    &:hover {
      color: var(--ui-color-grey-100);
      background-color: var(--ui-color-primary-main);
    }

    .icon {
      width: 21px;
      height: 21px;
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

.project-item:hover {
  box-shadow: 0px 4px 12px 0px rgba(36, 41, 47, 0.08);
  .options {
    visibility: visible;
    opacity: 1;
  }
}

.info {
  padding: var(--ui-gap-middle);

  .header {
    display: flex;
    align-items: center;
    gap: 8px;

    .name {
      flex: 0 1 auto;
      font-size: 15px;
      line-height: 24px;
      color: var(--ui-color-title);
      @include text-ellipsis;
    }

    .public,
    .private {
      flex: 0 0 auto;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: var(--ui-color-grey-200);
    }

    .public {
      color: #378ff6;
      .icon {
        width: 14px;
        height: 14px;
      }
    }

    .private {
      color: #ff972b;
      .icon {
        width: 12px;
        height: 12px;
      }
    }
  }

  .others {
    margin-top: 4px;
    display: flex;
    gap: 12px;
    font-size: 13px;
    color: var(--ui-color-grey-700);

    .part {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 4px;

      &.liking {
        color: var(--ui-color-red-200);
      }

      &.time {
        flex: 1 1 auto;
        display: block; // text-ellipsis does not work on `display: flex` elements
        @include text-ellipsis;
      }
    }
  }
}
</style>
