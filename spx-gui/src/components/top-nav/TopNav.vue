<template>
  <nav class="top-nav">
    <div class="left">
      <router-link class="logo" to="/">
        <img :src="logoSvg" />
      </router-link>
      <UIDropdown placement="bottom-start">
        <template #trigger>
          <div class="project-dropdown">
            <UIIcon class="icon-file" type="file" />
            <UIIcon class="icon-arrow" type="arrowDown" />
          </div>
        </template>
        <UIMenu>
          <UIMenuGroup :disabled="!isOnline">
            <UIMenuItem @click="handleNewProject">
              <template #icon><img :src="newSvg" /></template>
              {{ $t({ en: 'New project', zh: '新建项目' }) }}
            </UIMenuItem>
            <UIMenuItem @click="openProject">
              <template #icon><img :src="openSvg" /></template>
              {{ $t({ en: 'Open project...', zh: '打开项目...' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup :disabled="project == null">
            <UIMenuItem @click="handleImportProjectFile">
              <template #icon><img :src="importProjectSvg" /></template>
              {{ $t({ en: 'Import project file...', zh: '导入项目文件...' }) }}
            </UIMenuItem>
            <UIMenuItem @click="handleExportProjectFile">
              <template #icon><img :src="exportProjectSvg" /></template>
              {{ $t({ en: 'Export project file', zh: '导出项目文件' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup :disabled="project == null">
            <UIMenuItem @click="handleImportFromScratch">
              <template #icon><img :src="importScratchSvg" /></template>
              {{ $t({ en: 'Import assets from Scratch file', zh: '从 Scratch 项目文件导入' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup :disabled="project == null || !isOnline">
            <UIMenuItem @click="shareProject(project!)">
              <template #icon><img :src="shareSvg" /></template>
              {{ $t({ en: 'Share project', zh: '分享项目' }) }}
            </UIMenuItem>
            <UIMenuItem
              v-if="project?.isPublic === IsPublic.public"
              @click="stopSharingProject(project!)"
            >
              <template #icon><img :src="stopSharingSvg" /></template>
              {{ $t({ en: 'Stop sharing', zh: '停止分享' }) }}
            </UIMenuItem>
          </UIMenuGroup>
        </UIMenu>
      </UIDropdown>
      <UITooltip placement="bottom">
        <template #trigger>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="lang" @click="toggleLang" v-html="langContent"></div>
        </template>
        {{ $t({ en: 'English / 中文', zh: '中文 / English' }) }}
      </UITooltip>
    </div>
    <div class="center">
      <p class="project-name">{{ project?.name }}</p>
    </div>
    <div class="right">
      <div class="save">
        <UIButton
          v-if="project != null"
          type="secondary"
          :disabled="!isOnline"
          :loading="handleSave.isLoading.value"
          @click="handleSave.fn"
        >
          {{ $t({ en: 'Save', zh: '保存' }) }}
        </UIButton>
      </div>
      <div v-if="!userStore.userInfo" class="sign-in">
        <UIButton :disabled="!isOnline" @click="userStore.signInWithRedirection()">{{
          $t({ en: 'Sign in', zh: '登录' })
        }}</UIButton>
      </div>
      <UIDropdown v-else placement="bottom-end">
        <template #trigger>
          <div class="avatar">
            <img class="avatar-img" :src="userStore.userInfo.avatar" />
          </div>
        </template>
        <UIMenu class="user-menu">
          <UIMenuGroup>
            <UIMenuItem :interactive="false">
              {{ userStore.userInfo.displayName || userStore.userInfo.name }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup>
            <UIMenuItem @click="userStore.signOut()">{{
              $t({ en: 'Sign out', zh: '登出' })
            }}</UIMenuItem>
          </UIMenuGroup>
        </UIMenu>
      </UIDropdown>
    </div>
  </nav>
</template>

<script setup lang="ts">
// if this top-nav is for editor only, we should move it into editor
// TODO: check if the same top nav is needed for pages other than editor

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  UIButton,
  UIDropdown,
  UITooltip,
  UIMenu,
  UIMenuGroup,
  UIMenuItem,
  UIIcon,
  useConfirmDialog
} from '@/components/ui'
import saveAs from 'file-saver'
import { useNetwork } from '@/utils/network'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { selectFile } from '@/utils/file'
import { IsPublic } from '@/apis/common'
import { getProjectEditorRoute } from '@/router'
import { Project } from '@/models/project'
import { useUserStore } from '@/stores'
import {
  useCreateProject,
  useOpenProject,
  useSaveAndShareProject,
  useStopSharingProject
} from '@/components/project'
import { useLoadFromScratchModal } from '@/components/asset'
import logoSvg from './logo.svg'
import enSvg from './icons/en.svg?raw'
import zhSvg from './icons/zh.svg?raw'
import newSvg from './icons/new.svg'
import openSvg from './icons/open.svg'
import importProjectSvg from './icons/import-project.svg'
import exportProjectSvg from './icons/export-project.svg'
import importScratchSvg from './icons/import-scratch.svg'
import shareSvg from './icons/share.svg'
import stopSharingSvg from './icons/stop-sharing.svg'

const props = defineProps<{
  project: Project | null
}>()

const i18n = useI18n()
const userStore = useUserStore()
const { isOnline } = useNetwork()
const router = useRouter()

const createProject = useCreateProject()
const openProject = useOpenProject()
const shareProject = useSaveAndShareProject()
const stopSharingProject = useStopSharingProject()
const loadFromScratchModal = useLoadFromScratchModal()

async function handleNewProject() {
  const { name } = await createProject()
  router.push(getProjectEditorRoute(name))
}

const confirm = useConfirmDialog()

async function handleImportProjectFile() {
  await confirm({
    title: i18n.t({ en: 'Import project file', zh: '导入项目文件' }),
    content: i18n.t({
      en: 'Existing content of current project will be replaced with imported content. Are you sure to continue?',
      zh: '当前项目中的内容将被导入项目文件的内容覆盖，确定继续吗？'
    }),
    confirmText: i18n.t({ en: 'Continue', zh: '继续' })
  })
  const file = await selectFile({ accept: '.gbp' })
  await props.project!.loadGbpFile(file)
}

async function handleExportProjectFile() {
  const gbpFile = await props.project!.exportGbpFile()
  saveAs(gbpFile, gbpFile.name) // TODO: what if user cancelled download?
}

async function handleImportFromScratch() {
  if (!props.project) return
  loadFromScratchModal(props.project)
}

const langContent = computed(() => (i18n.lang.value === 'en' ? enSvg : zhSvg))

function toggleLang() {
  i18n.setLang(i18n.lang.value === 'en' ? 'zh' : 'en')
  // Refresh the page to apply the new language for monaco editor
  location.reload()
}

const handleSave = useMessageHandle(
  () => props.project!.saveToCloud(),
  { en: 'Failed to save project', zh: '项目保存失败' },
  { en: 'Project saved', zh: '保存成功' }
)
</script>

<style lang="scss" scoped>
// TODO: should `24px` be some pre-defined gap?

.top-nav {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;

  color: var(--ui-color-grey-100);
  background-color: var(--ui-color-primary-main);
  background-position: center;
  background-repeat: repeat;
  background-image: url(./bg.svg);
  box-shadow: var(--ui-box-shadow-diffusion);
  height: 50px;
}

.left,
.right {
  flex-basis: 30%;
  display: flex;
}

.center {
  flex-basis: 40%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.right {
  justify-content: flex-end;
}

.logo {
  height: 100%;
  margin: 0 20px 0 24px;
  display: flex;
  align-items: center;
}

.project-dropdown,
.lang {
  height: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;

  &:hover {
    background-color: var(--ui-color-primary-600);
  }
}

.project-dropdown {
  .icon-file {
    width: 24px;
    height: 24px;
  }
  .icon-arrow {
    width: 16px;
    height: 16px;
  }
}

.lang {
  cursor: pointer;
}

.save,
.sign-in,
.avatar {
  height: 100%;
  display: flex;
  align-items: center;
}

.project-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 16px;
}

.save {
  margin: 0 8px;
}

.avatar {
  margin-right: 8px;
  padding: 0 24px;

  &:hover {
    background-color: var(--ui-color-primary-600);
  }

  .avatar-img {
    width: 32px;
    height: 32px;
    border-radius: 16px;
  }
}

.user-menu {
  min-width: 120px;
}
</style>
