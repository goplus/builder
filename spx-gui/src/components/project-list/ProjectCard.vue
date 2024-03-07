<template>
  <n-card id="project-card" hoverable>
    <template #cover>
      <img :src="defaultProjectImage" alt="">
    </template>

    <template #header>
      <p class="title">
        <span class="title-text">{{ project.name || project.id }}</span>
        <n-tag round size="small" :bordered="false" type="primary">
          <span v-if="isUserOwn">Own</span>
          <span v-else>{{ project.authorId }}</span>
          <template #icon>
            <n-icon size="12">
              <UserOutlined></UserOutlined>
            </n-icon>
          </template>
        </n-tag>
      </p>
    </template>

    <div class="info">
      <p v-if="!isLocal" :style="statusStyle" class="public-status">status: {{ publicStatusText(publicStatus) }}</p>
      <p class="create-time">create: {{ formatTime(project.cTime) }} </p>
      <p class="update-time">update: {{ formatTime(project.uTime) }} </p>
    </div>

    <template #action>
      <div class="action">
        <n-button
          quaternary
          size="small"
          class="load-btn"
          @click="load"
        >
          Load
        </n-button>
        <n-button
          v-if="isUserOwn"
          quaternary
          size="small"
          @click="remove"
        >
          Delete
        </n-button>
        <n-button
          v-if="!isLocal && isUserOwn"
          quaternary size="small"
          class="public-btn"
          @click="updateProjectIsPublic"
        >
          {{ publicStatusText(!publicStatus) }}
        </n-button>
      </div>
    </template>
  </n-card>
</template>

<script lang="ts" setup>
import { type ProjectSummary, Project, ProjectSource, PublicStatus } from '@/class/project'
import { computed, defineProps, ref } from 'vue'
import { useProjectStore, useUserStore } from '@/store';
import { NCard, NButton, NTag, NIcon, createDiscreteApi, useMessage } from 'naive-ui'
import { UserOutlined } from '@vicons/antd'
import defaultProjectImage from '@/assets/image/project/project.png'

const { project } = defineProps<{
  project: ProjectSummary
}>()
const emit = defineEmits(['load-project', 'remove-project'])
const userStore = useUserStore()
const isUserOwn = computed(() => !project.authorId || userStore.userInfo?.id === project.authorId)
const publicStatus = ref(project.isPublic == PublicStatus.public)
const isLocal = computed(() => project.source === ProjectSource.local)
const { dialog } = createDiscreteApi(['dialog'])
const message = useMessage()

const publicStatusText = (status: boolean) => status ? 'Public' : 'Private'
const statusStyle = computed(() => {
  return {
    color: publicStatus.value ? '#4CAF50' : '#FF7E6C'
  }
})

const load = async () => {
  await useProjectStore().loadProject(project.id, project.source)
  emit('load-project')
}

const remove = () => {
  dialog.warning({
    title: 'Remove Project',
    content: 'Are you sure you want to remove this project (' + (project.name || project.id) + ')? This action cannot be undone.',
    positiveText: 'Yes',
    negativeText: 'No',
    onPositiveClick: async () => {
      await Project.removeProject(project.id, project.source)
      emit('remove-project')
    }
  })
}

const updateProjectIsPublic = async () => {
  try {
    dialog.warning({
      title: 'Change Public Status',
      content: 'Are you sure you want to change public status of this project (' + (project.name || project.id) + ') to ' + publicStatusText(!publicStatus.value) + '?',
      positiveText: 'Yes',
      negativeText: 'No',
      onPositiveClick: async () => {
        await Project.updateProjectIsPublic(project.id)
        message.success('change project status success')
        publicStatus.value = !publicStatus.value
      }
    })
  } catch (e) {
    message.error('change project status failed')
  }
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString()
}
</script>

<style lang="scss" scoped>
@import '@/assets/theme.scss';

.n-card {
  width: 100%;
  border-radius: 20px;
  box-sizing: border-box;
  overflow: hidden;

  .icon-delete {
    position: absolute;
    top: 10px;
    right: 10px;
    height: 28px;
    width: 28px;
    text-align: center;
    border-radius: 50%;
    font-weight: bolder;
    cursor: pointer;
    background-color: $background-color;
    border: 1px solid $base-color;

    &:hover {
      filter: brightness(0.95);
    }

    &:active {
      filter: brightness(0.9);
    }

    i {
      color: $base-color;
      font-size: 20px;
      line-height: 1;
      user-select: none;
    }
  }

  p {
    margin: 0;
    font-family: ChauPhilomeneOne, AlibabaPuHuiT, Cherry Bomb, Heyhoo, sans-serif;
    text-align: left;

    &.title {
      font-size: 18px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      line-height: 1;
      display: flex;
      flex-wrap: nowrap;

      .title-text {
        text-overflow: ellipsis;
        overflow: hidden;
      }

      .n-tag {
        margin-left: 12px;
        line-height: 16px;
        margin-right: auto;

        :deep(.n-tag__icon) {
          margin-right: 8px;
          align-items: baseline;
        }
      }
    }
  }

  :deep(.n-card-header),
  :deep(.n-card__footer),
  :deep(.n-card__action),
  .info {
    background-color: rgba(252, 228, 236, 0.6);
  }

  :deep(.n-card-header) {
    height: 10px;
    border-radius: 0;
    padding-right: 10px;
    padding-left: 20px;
  }

  :deep(.n-card__action) {
    padding: 10px;

    .action {
      display: flex;
      flex-wrap: wrap;
    }
  }

  .info {
    padding-left: 20px;

    p {
      font-size: 13px;
      color: #9E9E9E;
    }
  }

  .action {
    display: flex;

    .n-button {
      border-radius: 15px;
      color: #FF4081;
    }
  }
}
</style>