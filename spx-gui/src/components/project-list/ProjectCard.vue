<template>
  <n-card id="project-card" hoverable >
    <template #cover>
      <img src="@/assets/image/project/project.png" alt="">
    </template>

    <template #header>
      <p class="title">{{ project.name || project.id }}</p>
    </template>

    <div class="info">
      <p v-if="tab == 'Cloud'" class="public-status">status: {{ publicStatus ? 'public' : 'private' }}</p>
      <p class="create-time">create: {{moment(project.cTime).format('YYYY-MM-DD HH:mm:ss')}} </p>
      <p class="update-time">update: {{moment(project.uTime).format('YYYY-MM-DD HH:mm:ss')}} </p>
      <p v-if="tab == 'Public'" class="author">author: {{ project.authorId }} </p>
    </div>
    <template #action>
      <div class="action">
        <n-button quaternary  size="small" class="load-btn" @click="load">Load</n-button>
        <n-button v-if="tab == 'Local' || 'Cloud'" quaternary  size="small" @click="remove">Delete</n-button>
        <n-button v-if="tab == 'Cloud'" quaternary  size="small" class="public-btn" @click="updateProjectIsPublic">{{ publicStatus ? 'Public' : 'Private' }}</n-button>
      </div>
    </template>
  </n-card>
</template>

<script lang="ts" setup>
import {removeProject, type ProjectSummary, Project} from '@/class/project'
import {defineProps, ref} from 'vue'
import { useProjectStore } from '@/store';
import { NCard, NButton, createDiscreteApi, useMessage } from 'naive-ui';
import moment from 'moment';

const { project } = defineProps<{
  project: ProjectSummary,
  tab: string
}>()
const emit = defineEmits(['load-project', 'remove-project'])
const publicStatus = ref(project.isPublic == 1)
const { dialog } = createDiscreteApi(['dialog'])
const message = useMessage()

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
            await removeProject(project.id, project.source)
            emit('remove-project')
        }
    })
}

const updateProjectIsPublic = async () => {
  await Project.updateProjectIsPublic(project.id)
  message.success('change project status success')
  publicStatus.value = !publicStatus.value
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
  }

  :deep(.n-card__action) {
    padding: 10px;
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