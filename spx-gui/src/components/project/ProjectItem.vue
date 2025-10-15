<template>
  <li
    v-radar="{
      name: `Project item \u0022${project.owner}/${project.name}\u0022`,
      desc: `Click to ${props.context === 'edit' ? 'edit' : 'view'} the project${operatable ? ', hover for more operations' : ''}`
    }"
    class="project-item"
  >
    <RouterLink class="link" :to="to" @click="emit('selected')">
      <div class="thumbnail-wrapper">
        <UIImg class="thumbnail" :src="thumbnailUrl" size="cover" />
        <UIDropdown v-if="operatable" trigger="click" placement="bottom-end">
          <template #trigger>
            <div
              v-radar="{
                name: 'Project item operations',
                desc: 'More operations (edit, remove) for project item, click to open the menu'
              }"
              class="options"
              @click.stop.prevent
            >
              <UIIcon class="icon" type="more" />
            </div>
          </template>
          <UIMenu>
            <UIMenuItem v-radar="{ name: 'Edit option', desc: 'Click to edit the project' }" @click="handleEdit">
              {{ $t({ en: 'Edit', zh: '编辑' }) }}
            </UIMenuItem>
            <UIMenuItem v-radar="{ name: 'Remove option', desc: 'Click to remove the project' }" @click="handleRemove">
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
          <UserAvatar
            v-radar="{ name: 'Project owner avatar', desc: 'Click to view profile of project owner' }"
            class="owner-avatar"
            size="small"
            :user="project.owner"
          />
        </div>
      </div>
      <div class="info">
        <div class="header">
          <h5 class="name" :title="project.name">{{ project.name }}</h5>
          <template v-if="context !== 'public' && isOwner">
            <i v-if="project.visibility === Visibility.Public" class="icon" :title="$t({ en: 'Public', zh: '公开' })">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M15.221 9.88533L14.829 10.2774C14.5792 10.5272 14.4387 10.8668 14.4387 11.2206V11.7726C14.4387 13.2447 13.2457 14.4377 11.7736 14.4377H11.2216C10.8678 14.4377 10.5291 14.5782 10.2784 14.828L9.88544 15.22C8.84446 16.261 7.15722 16.261 6.11624 15.22L5.72331 14.828C5.47351 14.5782 5.13389 14.4377 4.78009 14.4377H4.22807C2.75594 14.4377 1.56302 13.2447 1.56302 11.7726V11.2206C1.56302 10.8668 1.42249 10.5281 1.17269 10.2774L0.780732 9.88533C-0.260244 8.84435 -0.260244 7.15711 0.780732 6.11614L1.17269 5.72409C1.42249 5.4743 1.56302 5.13471 1.56302 4.7809V4.22885C1.56302 2.75673 2.75594 1.56376 4.22807 1.56376H4.78009C5.13389 1.56376 5.47262 1.4233 5.72331 1.1735L6.11624 0.781464C7.15722 -0.259511 8.84446 -0.259511 9.88544 0.781464L10.2784 1.1735C10.5282 1.4233 10.8678 1.56376 11.2216 1.56376H11.7736C13.2457 1.56376 14.4387 2.75673 14.4387 4.22885V4.7809C14.4387 5.13471 14.5792 5.47341 14.829 5.72409L15.221 6.11614C16.2619 7.15711 16.2619 8.84435 15.221 9.88533Z"
                  fill="#219FFC"
                />
                <g clip-path="url(#clip0_480_7774)">
                  <path
                    d="M8.00035 3.95435C5.76935 3.95435 3.95459 5.76948 3.95459 8.00011C3.95459 10.2307 5.76935 12.0459 8.00035 12.0459C10.2314 12.0459 12.0461 10.2307 12.0461 8.00011C12.0461 5.76948 10.2314 3.95435 8.00035 3.95435ZM4.51911 8.00011C4.51911 7.59892 4.59062 7.21504 4.71632 6.856C4.94965 8.55334 6.4385 8.69673 6.50285 8.96733C6.57436 9.27217 6.50286 9.3625 6.5292 9.88562C6.55555 10.4088 7.27813 10.4163 7.55663 10.8303C7.63867 10.9507 7.68611 11.2085 7.66579 11.4644C5.90259 11.2954 4.51911 9.80659 4.51911 8.00011ZM8.94499 11.3477C9.20129 10.545 9.97091 10.2729 10.0492 9.80885C10.112 9.43664 9.62279 9.2462 9.18359 9.19201C8.74853 9.14195 8.81139 8.6862 8.50203 8.36404C8.19267 8.04189 7.99019 8.06032 7.5555 8.11451C7.1163 8.16457 6.74823 8.13334 6.62667 7.86575C6.50962 7.59817 6.66017 7.47021 6.34027 7.13864C6.07381 6.8624 6.35984 6.61477 6.5021 6.58127C6.72791 6.52708 7.12947 6.92186 7.36469 6.87369C8.07335 6.72766 7.22431 5.34081 8.28863 4.99194C8.47493 4.93097 8.64917 4.7827 8.73686 4.59904C9.34504 4.73076 9.89226 5.0228 10.3371 5.427C10.4594 5.77512 10.5445 6.17482 10.4733 6.3867C10.3311 6.8259 9.97394 7.14165 10.3638 7.86048C10.7707 8.61092 11.0217 8.71292 11.2046 8.50668C11.2772 8.42463 11.3717 8.36668 11.4658 8.33168C11.3277 9.77573 10.304 10.9635 8.94499 11.3477Z"
                    fill="white"
                    stroke="white"
                    stroke-width="0.166741"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_480_7774">
                    <rect width="9.60011" height="9.60011" fill="white" transform="matrix(1 0 0 -1 3.2002 12.8003)" />
                  </clipPath>
                </defs>
              </svg>
            </i>
            <i v-else class="icon" :title="$t({ en: 'Private', zh: '私有' })">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M15.221 9.88533L14.829 10.2774C14.5792 10.5272 14.4387 10.8668 14.4387 11.2206V11.7726C14.4387 13.2447 13.2457 14.4377 11.7736 14.4377H11.2216C10.8678 14.4377 10.5291 14.5782 10.2784 14.828L9.88544 15.22C8.84446 16.261 7.15722 16.261 6.11624 15.22L5.72331 14.828C5.47351 14.5782 5.13389 14.4377 4.78009 14.4377H4.22807C2.75594 14.4377 1.56302 13.2447 1.56302 11.7726V11.2206C1.56302 10.8668 1.42249 10.5281 1.17269 10.2774L0.780732 9.88533C-0.260244 8.84435 -0.260244 7.15711 0.780732 6.11614L1.17269 5.72409C1.42249 5.4743 1.56302 5.13471 1.56302 4.7809V4.22885C1.56302 2.75673 2.75594 1.56376 4.22807 1.56376H4.78009C5.13389 1.56376 5.47262 1.4233 5.72331 1.1735L6.11624 0.781464C7.15722 -0.259511 8.84446 -0.259511 9.88544 0.781464L10.2784 1.1735C10.5282 1.4233 10.8678 1.56376 11.2216 1.56376H11.7736C13.2457 1.56376 14.4387 2.75673 14.4387 4.22885V4.7809C14.4387 5.13471 14.5792 5.47341 14.829 5.72409L15.221 6.11614C16.2619 7.15711 16.2619 8.84435 15.221 9.88533Z"
                  fill="#FAA135"
                />
                <path
                  d="M5.60376 5.64023C5.60376 4.75786 6.32134 4.04028 7.20371 4.04028C8.08608 4.04028 8.80366 4.75786 8.80366 5.64023C8.80366 6.5226 8.08608 7.24018 7.20371 7.24018C6.32134 7.24018 5.60376 6.5226 5.60376 5.64023ZM9.40203 8.50654C9.40003 8.48734 9.38484 8.45176 9.35564 8.43096C9.02325 8.18897 8.57765 8.04015 8.00007 8.04015H6.40012C4.77618 8.04015 4.2002 9.22812 4.2002 10.2481C4.2002 11.1601 4.68418 11.64 5.60015 11.64H8.68403C8.74403 11.64 8.80005 11.592 8.80405 11.528C8.80405 11.524 8.80405 11.524 8.80405 11.52V11.516C8.80005 11.484 8.80005 11.4481 8.80005 11.4121V10.4681C8.80005 10.0601 8.94404 9.72807 9.20003 9.51608V9.34011C9.20003 9.06452 9.26884 8.80813 9.38924 8.58374C9.40523 8.55374 9.40403 8.52574 9.40203 8.50654ZM12.1999 10.4685V11.4112C12.1999 11.83 11.9999 12.0396 11.6 12.0396H10C9.60002 12.0396 9.40003 11.83 9.40003 11.4112V10.4685C9.40003 10.1293 9.53802 9.93448 9.80001 9.86968V9.33972C9.80001 8.78854 10.2484 8.33975 10.8 8.33975C11.3516 8.33975 11.7999 8.78854 11.7999 9.33972V9.86968C12.0619 9.93448 12.1999 10.1293 12.1999 10.4685ZM11.2 9.34011C11.2 9.11972 11.0208 8.94012 10.8 8.94012C10.5792 8.94012 10.4 9.11972 10.4 9.34011V9.84009H11.2V9.34011Z"
                  fill="white"
                />
              </svg>
            </i>
          </template>
        </div>
        <p class="others">
          <span class="part" :class="{ liking }" :title="$t(likesTitle)">
            <UIIcon class="icon" type="heart" />
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
import {
  humanizeCount,
  humanizeExactCount,
  humanizeTime,
  humanizeExactTime,
  useAsyncComputedLegacy
} from '@/utils/utils'
import { getProjectEditorRoute, getProjectPageRoute } from '@/router'
import { Visibility, type ProjectData } from '@/apis/project'
import { createFileWithUniversalUrl, getPublishedContent } from '@/models/common/cloud'
import { getSignedInUsername } from '@/stores/user'
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

const isOwner = computed(() => props.project.owner === getSignedInUsername())
const operatable = computed(() => props.context === 'mine' && isOwner.value)

const router = useRouter()

const to = computed(() => {
  const { owner, name } = props.project
  return props.context === 'edit' ? getProjectEditorRoute(owner, name) : getProjectPageRoute(owner, name)
})

const thumbnailUrl = useAsyncComputedLegacy(async (onCleanup) => {
  const thumbnailUniversalUrl = getPublishedContent(props.project)?.thumbnail ?? props.project.thumbnail
  if (thumbnailUniversalUrl === '') return null
  const thumbnail = createFileWithUniversalUrl(thumbnailUniversalUrl)
  return thumbnail.url(onCleanup)
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
  router.push(getProjectEditorRoute(props.project.owner, props.project.name))
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
  display: flex;
  flex-direction: column;
  text-decoration: none;
}

.thumbnail-wrapper {
  position: relative;
  width: 100%;
  height: 172px;
  background-position: center;
  background-size: contain;
  background-image: url(@/assets/images/stage-bg.svg);

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
    gap: 4px;

    .name {
      flex: 0 1 auto;
      font-size: 15px;
      line-height: 24px;
      color: var(--ui-color-title);
      @include text-ellipsis;
    }

    .icon {
      width: 16px;
      height: 16px;
    }
  }

  .others {
    margin-top: 4px;
    display: flex;
    height: 20px;
    gap: 12px;
    font-size: 13px;
    line-height: 20px;
    color: var(--ui-color-grey-700);

    .part {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 4px;

      .icon {
        width: 14px;
        height: 14px;
      }

      &.liking {
        color: var(--ui-color-red-main);
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
