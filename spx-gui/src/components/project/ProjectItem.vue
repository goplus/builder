<template>
  <li :class="['project-item', { 'in-homepage': inHomepage }]">
    <div class="img-box">
      <UIImg class="img" :src="imgSrc" :loading="imgLoading" no-cover />
    </div>
    <div class="info">
      <div class="name-container">
        <div class="name">{{ projectData.name }}</div>
        <UIDropdown trigger="click">
          <template #trigger>
            <div @click.stop>
              <UIIcon type="more" />
            </div>
          </template>
          <UIMenu>
            <UIMenuItem @click="() => handleRemoveProject(projectData)">
              {{ $t({ en: 'Remove project', zh: '删除项目' }) }}
            </UIMenuItem>
          </UIMenu>
        </UIDropdown>
      </div>
      <p class="creation-time">{{ creationTime }}</p>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, shallowRef, watchEffect } from 'vue'
import dayjs from 'dayjs'
import { UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import defaultSpritePng from '@/assets/default-sprite.png'
import type { ProjectData } from '@/apis/project'
import { Project } from '@/models/project'
import { UIDropdown, UIIcon, UIMenu, UIMenuItem } from '../ui'
import { useRemoveProject } from '.'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  inHomepage?: boolean
  projectData: ProjectData
}>()

const emit = defineEmits<{
  removed: []
}>()

const project = shallowRef<Project | null>(null)

const removeProject = useRemoveProject()

const handleRemoveProject = useMessageHandle(
  async (projectData: ProjectData) => {
    await removeProject(projectData.owner, projectData.name)
    emit('removed')
  },
  { en: 'Failed to remove project', zh: '删除项目失败' }
).fn

watchEffect(async (onCleanup) => {
  let p = new Project()
  onCleanup(() => p.dispose())
  await p.loadFromCloud(props.projectData)
  project.value = p
})

const [_imgSrc, _imgLoading] = useFileUrl(() => project.value?.sprites[0]?.defaultCostume?.img)
const imgLoading = computed(() => project.value == null || _imgLoading.value)
const imgSrc = computed(() => {
  if (_imgSrc.value != null) return _imgSrc.value
  return imgLoading.value ? null : defaultSpritePng
})

const creationTime = computed(() => dayjs(props.projectData.cTime).format('YYYY.MM.DD HH:mm'))
</script>

<style lang="scss" scoped>
.project-item {
  width: 168px;
  overflow: hidden;
  cursor: pointer;

  &:hover {
    .img-box,
    .info {
      border-color: var(--ui-color-primary-main);
    }

    .info {
      background-color: var(--ui-color-primary-200);
    }
  }

  .img-box {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 4 / 3;
    background-image: url(./bg.svg);
    background-position: center;
    background-repeat: repeat;
    background-size: contain;
    border: 2px solid transparent;
    border-bottom: none;
    border-radius: var(--ui-border-radius-2) var(--ui-border-radius-2) 0 0;

    .img {
      width: 118px;
      height: 118px;
    }
  }

  .info {
    padding: 8px 10px 6px;
    background-color: var(--ui-color-grey-300);
    border: 2px solid var(--ui-color-grey-300);
    border-top: none;
    border-radius: 0 0 var(--ui-border-radius-2) var(--ui-border-radius-2);
  }

  .name {
    font-size: 14px;
    line-height: 22px;
    color: var(--ui-color-title);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .creation-time {
    font-size: 10px;
    line-height: 18px;
    color: var(--ui-color-grey-800);
  }

  .name-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.project-item.in-homepage {
  width: 216px;

  .info {
    padding: 10px 10px 8px;
  }

  .name {
    font-size: 16px;
    line-height: 24px;
    margin-bottom: 4px;
  }

  .creation-time {
    font-size: 12px;
    line-height: 20px;
  }
}
</style>
