<template>
  <n-card id="project-card" hoverable :class="{'current': isCurrent}">
    <template #cover>
      <img :src="defaultProjectImage" alt="">
    </template>

    <template #header>
      <p class="title">
        <span class="title-text">
          {{ project.name || project.id }}
        </span>
        <n-tag
          round size="small"
          :bordered="false"
          type="primary"
        >
          <span v-if="isUserOwn">{{ $t('project.own') }}</span>
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
      <p v-if="isLocal">
        <n-tag
          v-if="isTemporary"
          round size="small"
          :bordered="false"
          type="primary"
        >
          <span>{{ $t('project.localProject') }}</span>
          <template #icon>
            <n-icon size="12">
              <HomeOutlined></HomeOutlined>
            </n-icon>
          </template>
        </n-tag>
        <n-tag v-else round size="small" :bordered="false" type="primary">
          <span>{{ $t('project.cloudProjectInLocal') }}</span>
          <template #icon>
            <n-icon size="12">
              <CloudOutlined></CloudOutlined>
            </n-icon>
          </template>
        </n-tag>
      </p>
      <p
          v-if="!isLocal"
          :style="statusStyle"
          class="public-status"
      >
        {{ publicStatus ? $t('project.publicStatus') : $t('project.privateStatus') }}
      </p>
      <p class="create-time">{{ $t('project.create') }}: {{ formatTime(project.cTime) }} </p>
      <p class="update-time">{{ $t('project.update') }}: {{ formatTime(project.uTime) }} </p>
    </div>

    <template #action>
      <div class="action">
        <n-button
          quaternary
          size="small"
          class="load-btn"
          @click="load"
        >
          {{ $t('project.load') }}
        </n-button>
        <n-button
          v-if="isUserOwn"
          quaternary
          size="small"
          @click="remove"
        >
          {{ $t('project.delete') }}
        </n-button>
        <n-button
          v-if="!isLocal && isUserOwn"
          size="small"
          quaternary
          class="public-btn"
          @click="updateProjectIsPublic"
        >
          {{ $t(`project.${!publicStatus ? 'public' : 'private'}`) }}
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
import { UserOutlined, CloudOutlined, HomeOutlined } from '@vicons/antd'
import defaultProjectImage from '@/assets/image/project/project.png'
import { useI18n } from "vue-i18n"

const { project } = defineProps<{
  project: ProjectSummary
}>()
const emit = defineEmits(['load-project', 'remove-project'])
const userStore = useUserStore()
const isUserOwn = computed(() => !project.authorId || userStore.userInfo?.id === project.authorId)
const publicStatus = ref(project.isPublic == PublicStatus.public)
const isLocal = computed(() => project.source === ProjectSource.local)
const isTemporary = computed(() => project.id.startsWith(Project.TEMPORARY_ID_PREFIX))
const isCurrent = computed(() => project.id === useProjectStore().project.id)
const { dialog } = createDiscreteApi(['dialog'])
const message = useMessage()
// i18n/i10n config
const { t } = useI18n({
  inheritLocale: true,
  useScope: 'global'
})

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
    title: t('project.removeTitle'),
    content: t(isLocal.value ? 'project.removeLocalContent' : 'project.removeCloudContent', { name: project.name || project.id }),
    positiveText: t('project.yes'),
    negativeText: t('project.no'),
    onPositiveClick: async () => {
      await Project.removeProject(project.id, project.source)
      emit('remove-project')
      // If the project is from cloud, remove it from local
      if (!isLocal.value) {
        await Project.removeProject(project.id, ProjectSource.local)
      }
      // If the project is the current project, load a blank project
      if (isCurrent.value) {
        message.success(t('project.removeMessage'))
        useProjectStore().loadBlankProject()
      }
    }
  })
}

const updateProjectIsPublic = async () => {
  try {
    dialog.warning({
      title: t('project.changeStatusTitle'),
      content: t('project.changeStatusContent', { name: project.name || project.id }),
      positiveText: t('project.yes'),
      negativeText: t('project.no'),
      onPositiveClick: async () => {
        await Project.updateProjectIsPublic(project.id, publicStatus.value ? PublicStatus.private : PublicStatus.public)
        message.success(t('project.successMessage'))
        publicStatus.value = !publicStatus.value
      }
    })
  } catch (e) {
    message.error(t('project.errMessage'))
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

  &.current {
    border: 3px solid $base-color;
  }

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
        margin-right: 12px;
      }
    }
  }

  .n-tag {
    line-height: 16px;

    :deep(.n-tag__icon) {
      margin-right: 8px;
      align-items: baseline;
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