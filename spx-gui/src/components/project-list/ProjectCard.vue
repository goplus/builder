<template>
  <n-card id="project-card" hoverable :class="{ current: isCurrent }">
    <template #cover>
      <img :src="defaultProjectImage" alt="" />
    </template>

    <template #header>
      <p class="title">
        <span class="title-text">
          {{ project.name || project.id }}
        </span>
        <n-tag round size="small" :bordered="false" type="primary">
          <span v-if="isUserOwn">{{ $t('project.own') }}</span>
          <span v-else>{{ project.owner }}</span>
          <template #icon>
            <n-icon size="12">
              <UserOutlined></UserOutlined>
            </n-icon>
          </template>
        </n-tag>
      </p>
    </template>

    <div class="info">
      <p :style="statusStyle" class="public-status">
        {{ isPublic ? $t('project.publicStatus') : $t('project.privateStatus') }}
      </p>
      <p class="create-time">{{ $t('project.create') }}: {{ formatTime(project.cTime) }}</p>
      <p class="update-time">{{ $t('project.update') }}: {{ formatTime(project.uTime) }}</p>
    </div>

    <template #action>
      <div class="action">
        <n-button quaternary size="small" class="load-btn" @click="load">
          {{ $t('project.load') }}
        </n-button>
        <n-button v-if="isUserOwn" quaternary size="small" @click="remove">
          {{ $t('project.delete') }}
        </n-button>
        <n-button
          v-if="isUserOwn"
          size="small"
          quaternary
          class="public-btn"
          @click="updateProjectIsPublic"
        >
          {{ $t(`project.${!isPublic ? 'public' : 'private'}`) }}
        </n-button>
      </div>
    </template>
  </n-card>
</template>

<script lang="ts" setup>
import type { ProjectData } from '@/apis/project'
import { IsPublic, deleteProject, updateProject } from '@/apis/project'
import { computed, defineProps, ref } from 'vue'
import { useProjectStore, useUserStore } from '@/stores'
import { NCard, NButton, NTag, NIcon, createDiscreteApi, useMessage } from 'naive-ui'
import { UserOutlined } from '@vicons/antd'
import defaultProjectImage from '@/assets/image/project/project.png'
import { useI18n } from 'vue-i18n'
import { fullName as projectFullName } from '@/models/project'

const { project } = defineProps<{
  project: ProjectData
}>()
const emit = defineEmits(['load-project', 'remove-project'])
const userStore = useUserStore()
const projectStore = useProjectStore()
const isUserOwn = computed(() => userStore.userInfo?.name === project.owner)
const isPublic = ref(project.isPublic == IsPublic.public)
const isCurrent = computed(
  () => project.owner === projectStore.project.owner && project.name === projectStore.project.name
)
const fullName = computed(() => projectFullName(project.owner, project.name))
const { dialog } = createDiscreteApi(['dialog'])
const message = useMessage()
// i18n/i10n config
const { t } = useI18n({
  inheritLocale: true,
  useScope: 'global'
})

const statusStyle = computed(() => {
  return {
    color: isPublic.value ? '#4CAF50' : '#FF7E6C'
  }
})

const load = async () => {
  await projectStore.openProject(project.owner, project.name)
  emit('load-project')
}

const remove = () => {
  dialog.warning({
    title: t('project.removeTitle'),
    content: t('project.removeCloudContent', {
      name: fullName.value
    }),
    positiveText: t('project.yes'),
    negativeText: t('project.no'),
    onPositiveClick: async () => {
      await deleteProject(project.owner, project.name)
      emit('remove-project')
      // If the current opened project is deleted, load a blank project
      if (isCurrent.value) {
        message.success(t('project.removeMessage'))
        await projectStore.openBlankProject(userStore.userInfo!.name) // TODO: the `!` should not be needed
      }
    }
  })
}

const updateProjectIsPublic = async () => {
  try {
    dialog.warning({
      title: t('project.changeStatusTitle'),
      content: t('project.changeStatusContent', { name: fullName.value }),
      positiveText: t('project.yes'),
      negativeText: t('project.no'),
      onPositiveClick: async () => {
        const newIsPublic = isPublic.value ? IsPublic.personal : IsPublic.public
        await updateProject(project.owner, project.name, { ...project, isPublic: newIsPublic })
        message.success(t('project.successMessage'))
        isPublic.value = !isPublic.value
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
    font-family:
      ChauPhilomeneOne,
      AlibabaPuHuiT,
      Cherry Bomb,
      Heyhoo,
      sans-serif;
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
      color: #9e9e9e;
    }
  }

  .action {
    display: flex;

    .n-button {
      border-radius: 15px;
      color: #ff4081;
    }
  }
}
</style>
