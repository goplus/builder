<template>
  <li class="project-item">
    <RouterLink class="link" :to="to" @click="emit('selected')">
      <div class="thumbnail-wrapper">
        <UIImg class="thumbnail" :src="project.thumbnail" />
        <UIDropdown v-if="context === 'mine'" trigger="click" placement="bottom-end">
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
        <UserAvatar class="owner-avatar" :owner="project.owner" />
      </div>
      <div class="info">
        <div class="name">{{ project.name }}</div>
        <p class="others">
          <template v-if="context !== 'public'">
            <span v-if="project.isPublic === IsPublic.public" class="part">
              <UIIcon type="statePublic" />
              {{ $t({ en: 'Public', zh: '公开' }) }}
            </span>
            <span v-else class="part">
              <UIIcon type="statePrivate" />
              {{ $t({ en: 'Private', zh: '私有' }) }}
            </span>
          </template>
          <span class="part" :class="{ liking }" :title="$t(likesTitle)">
            <UIIcon type="heart" />
            {{ $t(humanizeCount(project.likeCount)) }}
          </span>
          <span class="part time" :title="$t(timeTitle)">
            {{ $t(humanizeTime(project.uTime)) }}
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
import {
  humanizeCount,
  humanizeExactCount,
  humanizeTime,
  humanizeExactTime,
  useAsyncComputed
} from '@/utils/utils'
import { getProjectEditorRoute, getProjectPageRoute } from '@/router'
import { IsPublic, isLiking, type ProjectData } from '@/apis/project'
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

const router = useRouter()

const to = computed(() => {
  const { owner, name } = props.project
  return props.context === 'edit' ? getProjectEditorRoute(name) : getProjectPageRoute(owner, name)
})

const liking = useAsyncComputed(() => isLiking(props.project.owner, props.project.name))

const likesTitle = computed(() => {
  const count = humanizeExactCount(props.project.likeCount)
  return {
    en: `Liked by ${count.en} users`,
    zh: `${count.zh} 个用户喜欢`
  }
})

const timeTitle = computed(() => {
  const fullTime = humanizeExactTime(props.project.uTime)
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
  width: 240px;
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
  background-image: url(../bg.svg);

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

  .owner-avatar {
    position: absolute;
    bottom: 13px;
    right: 13px;
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

  .name {
    font-size: 15px;
    line-height: 24px;
    color: var(--ui-color-title);
    @include text-ellipsis;
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
