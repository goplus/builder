<template>
  <li :class="['project-item', { 'in-homepage': inHomepage }]">
    <div class="img-box">
      <div class="img" :style="imgStyle"></div>
    </div>
    <div class="info">
      <p class="name">{{ projectData.name }}</p>
      <p class="creation-time">{{ creationTime }}</p>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import dayjs from 'dayjs'
import { useFileUrl } from '@/utils/file'
import defaultSpritePng from '@/assets/default-sprite.png'
import type { ProjectData } from '@/apis/project'
import { Project } from '@/models/project'

const props = defineProps<{
  inHomepage?: boolean
  projectData: ProjectData
}>()

const project = ref<Project | null>(null)

watchEffect((onCleanup) => {
  let p = new Project()
  p.loadFromCloud(props.projectData)
  onCleanup(() => p.dispose())
  project.value = p
})

const imgSrc = useFileUrl(() => project.value?.sprites[0]?.costume?.img)

const imgStyle = computed(() => {
  const backgroundImage = imgSrc.value || defaultSpritePng
  return { backgroundImage: `url("${backgroundImage}")` }
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
    aspect-ratio: 4 / 3;
    padding: 2px 2px 4px;
    background-image: url(./bg.svg);
    background-position: center;
    background-repeat: repeat;
    background-size: contain;
    border: 2px solid transparent;
    border-bottom: none;
    border-radius: var(--ui-border-radius-2) var(--ui-border-radius-2) 0 0;

    .img {
      width: 100%;
      height: 100%;
      background-position: center;
      background-repeat: no-repeat;
      background-size: contain;
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
