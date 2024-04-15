<template>
  <nav class="top-nav">
    <img class="logo" :src="logoSvg" />
    <UIDropdown>
      <template #trigger>
        <div class="project-dropdown">
          <UIIcon class="icon-file" type="file" />
          <UIIcon class="icon-arrow" type="arrowDown" />
        </div>
      </template>
      <UIMenu>
        <UIMenuGroup>
          <UIMenuItem :disabled="!isOnline" @click="handleNewProject">
            {{ t({ en: 'New project', zh: '新建项目' }) }}
          </UIMenuItem>
          <UIMenuItem :disabled="!isOnline" @click="handleOpenProject">
            {{ t({ en: 'Open project...', zh: '打开项目...' }) }}
          </UIMenuItem>
        </UIMenuGroup>
        <UIMenuGroup>
          <UIMenuItem :disabled="project == null" @click="handleImportProjectFile">
            {{ t({ en: 'Import project file...', zh: '导入项目文件...' }) }}
          </UIMenuItem>
          <UIMenuItem :disabled="project == null" @click="handleExportProjectFile">
            {{ t({ en: 'Export project file', zh: '导出项目文件' }) }}
          </UIMenuItem>
        </UIMenuGroup>
        <UIMenuGroup>
          <UIMenuItem :disabled="project == null" @click="handleImportFromScratch">
            {{ t({ en: 'Import assets from Scratch file', zh: '从 Scratch 项目文件导入' }) }}
          </UIMenuItem>
        </UIMenuGroup>
        <UIMenuGroup>
          <UIMenuItem :disabled="project == null || !isOnline" @click="shareProject(project!)">
            {{ t({ en: 'Share project', zh: '分享项目' }) }}
          </UIMenuItem>
          <UIMenuItem
            v-if="project?.isPublic === IsPublic.public"
            @click="stopSharingProject(project!)"
          >
            {{ t({ en: 'Stop sharing', zh: '停止分享' }) }}
          </UIMenuItem>
        </UIMenuGroup>
      </UIMenu>
    </UIDropdown>
    <div class="language" @click="toggleLanguage">中文/En</div>
    <p class="project-name">{{ project?.name }}</p>
    <div class="save">
      <UIButton v-if="project != null" type="boring" :disabled="!isOnline" @click="handleSave">{{
        $t({ en: 'Save', zh: '保存' })
      }}</UIButton>
    </div>
    <UserAvatar />
  </nav>
</template>

<script setup lang="ts">
// if this top-nav is for editor only, we should move it into editor
// TODO: check if the same top nav is needed for pages other than editor

import { h } from 'vue'
import { useModal } from 'naive-ui'
import { UIButton, UIDropdown, UIMenu, UIMenuGroup, UIMenuItem, UIIcon } from '@/components/ui'
import saveAs from 'file-saver'
import { useNetwork } from '@/utils/network'
import { useToggleLanguage } from '@/i18n'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { selectFile } from '@/utils/file'
import { IsPublic } from '@/apis/common'
import { getProjectEditorRoute } from '@/router'
import { Project } from '@/models/project'
import {
  useCreateProject,
  useChooseProject,
  useSaveAndShareProject,
  useStopSharingProject
} from '@/components/project'
import { parseScratchFileAssets } from '@/utils/scratch'
import UserAvatar from './UserAvatar.vue'
import LoadFromScratch from '../library/LoadFromScratch.vue'
import logoSvg from './logo.svg'

const props = defineProps<{
  project: Project | null
}>()

const { t } = useI18n()
const { isOnline } = useNetwork()

const createProject = useCreateProject()
const chooseProject = useChooseProject()
const shareProject = useSaveAndShareProject()
const stopSharingProject = useStopSharingProject()

const importFromScratchModal = useModal()

function openProject(projectName: string) {
  // FIXME
  location.assign(getProjectEditorRoute(projectName))
}

async function handleNewProject() {
  const { name } = await createProject()
  openProject(name)
}

async function handleOpenProject() {
  const { name } = await chooseProject()
  openProject(name)
}

async function handleImportProjectFile() {
  const file = await selectFile({ accept: '.zip' })
  await props.project!.loadZipFile(file)
}

async function handleExportProjectFile() {
  const zipFile = await props.project!.exportZipFile()
  saveAs(zipFile, zipFile.name) // TODO: what if user cancelled download?
}

async function handleImportFromScratch() {
  const project = props.project
  if (!project) {
    return
  }
  const file = await selectFile({ accept: '.sb3' })
  const exportedScratchAssets = await parseScratchFileAssets(file)
  importFromScratchModal.create({
    title: t({ en: 'Import from Scratch', zh: '从 Scratch 导入' }),
    preset: 'dialog',
    content: () => h(LoadFromScratch, { scratchAssets: exportedScratchAssets, project })
  })
}

const toggleLanguage = useToggleLanguage()

const handleSave = useMessageHandle(
  () => props.project!.saveToCloud(),
  { en: 'Failed to save project', zh: '项目保存失败' },
  { en: 'Project saved', zh: '保存成功' },
  { en: 'Project saving', zh: '正在保存' }
)
</script>

<style lang="scss" scoped>
.top-nav {
  display: flex;
  flex-direction: row;
  align-items: center;

  color: var(--ui-color-grey-100);
  background: var(--ui-color-primary-main);
  box-shadow: var(--ui-box-shadow-diffusion);
  height: 50px;
  padding: 0 13px;
}

.logo {
  margin-right: 20px;
  align-self: center;
}

.project-dropdown,
.language {
  padding: 0 20px;
}

.project-dropdown {
  height: 100%;
  display: flex;
  align-items: center;

  &:hover {
    background-color: var(--ui-color-primary-600);
  }

  .icon-file {
    width: 24px;
    height: 24px;
  }

  .icon-arrow {
    width: 16px;
    height: 16px;
  }
}

.language {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.project-name,
.save {
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-name {
  flex: 1 1 0;
}

.save {
  margin-right: 24px;
}
</style>
