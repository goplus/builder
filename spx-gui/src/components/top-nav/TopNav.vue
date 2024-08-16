<!-- eslint-disable vue/no-v-html -->
<template>
  <nav class="top-nav">
    <div class="left">
      <router-link class="logo" to="/">
        <img :src="logoSvg" />
      </router-link>
      <UIDropdown placement="bottom-start">
        <template #trigger>
          <div class="dropdown">
            <UIIcon class="icon-main" type="file" />
            <UIIcon class="icon-arrow" type="arrowDown" />
          </div>
        </template>
        <UIMenu>
          <UIMenuGroup :disabled="!isOnline">
            <UIMenuItem @click="handleNewProject">
              <template #icon><img :src="newSvg" /></template>
              {{ $t({ en: 'New project', zh: '新建项目' }) }}
            </UIMenuItem>
            <UIMenuItem @click="handleOpenProject">
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
            <UIMenuItem @click="handleShareProject">
              <template #icon><img :src="shareSvg" /></template>
              {{ $t({ en: 'Share project', zh: '分享项目' }) }}
            </UIMenuItem>
            <UIMenuItem
              v-if="project?.isPublic === IsPublic.public"
              @click="handleStopSharingProject"
            >
              <template #icon><img :src="stopSharingSvg" /></template>
              {{ $t({ en: 'Stop sharing', zh: '停止分享' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup :disabled="project == null">
            <UIMenuItem @click="handleRemoveProject">
              <template #icon><img :src="removeProjectSvg" /></template>
              {{ $t({ en: 'Remove project', zh: '删除项目' }) }}
            </UIMenuItem>
          </UIMenuGroup>
        </UIMenu>
      </UIDropdown>
      <UIDropdown v-if="project != null" placement="bottom-start">
        <template #trigger>
          <div class="dropdown">
            <UIIcon class="icon-main" type="clock" />
            <UIIcon class="icon-arrow" type="arrowDown" />
          </div>
        </template>
        <UIMenu>
          <UIMenuItem :disabled="undoAction == null" @click="handleUndo.fn">
            <template #icon><img :src="undoSvg" /></template>
            <span class="history-menu-text">{{ $t(undoText) }}</span>
          </UIMenuItem>
          <UIMenuItem :disabled="redoAction == null" @click="handleRedo.fn">
            <template #icon><img :src="redoSvg" /></template>
            <span class="history-menu-text">{{ $t(redoText) }}</span>
          </UIMenuItem>
        </UIMenu>
      </UIDropdown>
      <UITooltip placement="bottom">
        <template #trigger>
          <div class="lang" @click="toggleLang" v-html="langContent"></div>
        </template>
        {{ $t({ en: 'English / 中文', zh: '中文 / English' }) }}
      </UITooltip>
    </div>
    <div class="center">
      <template v-if="project != null">
        <div class="project-name">{{ project.name }}</div>
        <div class="auto-save-state">
          <UITooltip placement="right">
            <template #trigger>
              <div
                :class="['icon', autoSaveStateIcon.stateClass]"
                v-html="autoSaveStateIcon.svg"
              ></div>
            </template>
            {{ $t(autoSaveStateIcon.desc) }}
          </UITooltip>
        </div>
      </template>
    </div>
    <div class="right">
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
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { selectFile } from '@/utils/file'
import { IsPublic } from '@/apis/common'
import { getProjectEditorRoute } from '@/router'
import { Project, AutoSaveToCloudState } from '@/models/project'
import { useUserStore } from '@/stores'
import {
  useCreateProject,
  useOpenProject,
  useRemoveProject,
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
import removeProjectSvg from './icons/remove-project.svg'
import importScratchSvg from './icons/import-scratch.svg'
import shareSvg from './icons/share.svg'
import stopSharingSvg from './icons/stop-sharing.svg'
import undoSvg from './icons/undo.svg'
import redoSvg from './icons/redo.svg'
import offlineSvg from './icons/offline.svg?raw'
import savingSvg from './icons/saving.svg?raw'
import failedToSaveSvg from './icons/failed-to-save.svg?raw'
import cloudCheckSvg from './icons/cloud-check.svg?raw'

const props = defineProps<{
  project: Project | null
}>()

const i18n = useI18n()
const userStore = useUserStore()
const { isOnline } = useNetwork()
const router = useRouter()

const createProject = useCreateProject()
const handleNewProject = useMessageHandle(
  async () => {
    const { name } = await createProject()
    router.push(getProjectEditorRoute(name))
  },
  { en: 'Failed to create new project', zh: '新建项目失败' }
).fn

const openProject = useOpenProject()
const handleOpenProject = useMessageHandle(openProject, {
  en: 'Failed to open project',
  zh: '打开项目失败'
}).fn

const confirm = useConfirmDialog()

const importProjectFileMessage = { en: 'Import project file', zh: '导入项目文件' }

const handleImportProjectFile = useMessageHandle(
  async () => {
    await confirm({
      title: i18n.t(importProjectFileMessage),
      content: i18n.t({
        en: 'Existing content of current project will be replaced with imported content. Are you sure to continue?',
        zh: '当前项目中的内容将被导入项目文件的内容覆盖，确定继续吗？'
      }),
      confirmText: i18n.t({ en: 'Continue', zh: '继续' })
    })
    const file = await selectFile({ accept: '.gbp' })
    const action = { name: importProjectFileMessage }
    await props.project?.history.doAction(action, () => props.project!.loadGbpFile(file))
  },
  { en: 'Failed to import project file', zh: '导入项目文件失败' }
).fn

const handleExportProjectFile = useMessageHandle(
  async () => {
    const gbpFile = await props.project!.exportGbpFile()
    saveAs(gbpFile, gbpFile.name) // TODO: what if user cancelled download?
  },
  { en: 'Failed to export project file', zh: '导出项目文件失败' }
).fn

const loadFromScratchModal = useLoadFromScratchModal()
const handleImportFromScratch = useMessageHandle(() => loadFromScratchModal(props.project!), {
  en: 'Failed to import from Scratch file',
  zh: '从 Scratch 项目文件导入失败'
}).fn

const shareProject = useSaveAndShareProject()
const handleShareProject = useMessageHandle(() => shareProject(props.project!), {
  en: 'Failed to share project',
  zh: '分享项目失败'
}).fn

const stopSharingProject = useStopSharingProject()
const handleStopSharingProject = useMessageHandle(
  () => stopSharingProject(props.project!),
  { en: 'Failed to stop sharing project', zh: '停止分享项目失败' },
  { en: 'Project sharing is now stopped', zh: '项目已停止分享' }
).fn

const removeProject = useRemoveProject()
const handleRemoveProject = useMessageHandle(
  async () => {
    await removeProject(props.project!.owner!, props.project!.name!)
    router.push('/')
  },
  { en: 'Failed to remove project', zh: '删除项目失败' }
).fn

const langContent = computed(() => (i18n.lang.value === 'en' ? enSvg : zhSvg))

function toggleLang() {
  i18n.setLang(i18n.lang.value === 'en' ? 'zh' : 'en')
  // Refresh the page to apply the new language for monaco editor
  location.reload()
}

type AutoSaveStateIcon = {
  svg: string
  stateClass?: string
  desc: LocaleMessage
}
const autoSaveStateIcon = computed<AutoSaveStateIcon>(() => {
  if (!isOnline.value)
    return { svg: offlineSvg, desc: { en: 'No internet connection', zh: '无网络连接' } }
  switch (props.project?.autoSaveToCloudState) {
    case AutoSaveToCloudState.Saved:
      return { svg: cloudCheckSvg, desc: { en: 'Saved', zh: '已保存' } }
    case AutoSaveToCloudState.Pending:
      return {
        svg: savingSvg,
        stateClass: 'pending',
        desc: { en: 'Pending save', zh: '待保存' }
      }
    case AutoSaveToCloudState.Saving:
      return { svg: savingSvg, stateClass: 'saving', desc: { en: 'Saving', zh: '保存中' } }
    case AutoSaveToCloudState.Failed:
      return { svg: failedToSaveSvg, desc: { en: 'Failed to save', zh: '保存失败' } }
    default:
      throw new Error('unknown auto save state')
  }
})

const undoAction = computed(() => props.project?.history.getUndoAction() ?? null)

const undoText = computed(() => ({
  en: undoAction.value != null ? `Undo "${undoAction.value.name.en}"` : 'Undo',
  zh: undoAction.value != null ? `撤销“${undoAction.value.name.zh}”` : '撤销'
}))

const redoAction = computed(() => props.project?.history.getRedoAction() ?? null)

const redoText = computed(() => ({
  en: redoAction.value != null ? `Redo "${redoAction.value.name.en}"` : 'Redo',
  zh: redoAction.value != null ? `重做“${redoAction.value.name.zh}”` : '重做'
}))

const handleUndo = useMessageHandle(() => props.project!.history.undo(), {
  en: 'Failed to undo',
  zh: '撤销操作失败'
})

const handleRedo = useMessageHandle(() => props.project!.history.redo(), {
  en: 'Failed to redo',
  zh: '重做操作失败'
})
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

.dropdown,
.lang {
  height: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;

  &:hover {
    background-color: var(--ui-color-primary-600);
  }
}

.dropdown {
  .icon-main {
    width: 24px;
    height: 24px;
  }
  .icon-arrow {
    width: 16px;
    height: 16px;
  }
}

.history-menu-text {
  max-width: 20em;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.lang {
  cursor: pointer;
}

.undo-redo {
  display: flex;
  gap: 12px;
  align-items: center;
}

.auto-save-state {
  margin-left: 8px;
  cursor: pointer;

  .icon {
    width: 24px;
    height: 24px;

    :deep(svg) {
      width: 100%;
      height: 100%;
    }

    &.pending :deep(svg) path,
    &.saving :deep(svg) path {
      stroke-dasharray: 2;
    }

    &.saving :deep(svg) path {
      animation: dash 1s linear infinite;

      @keyframes dash {
        to {
          stroke-dashoffset: 24;
        }
      }
    }
  }
}

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
