<template>
  <nav class="top-nav">
    <span class="logo">Go+ Builder</span>
    <div class="project-dropdown">
      <UIDropdown>
        <template #trigger>
          {{ $t({ en: 'Project', zh: '项目' }) }}
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
            <UIMenuItem :disabled="props.project == null" @click="handleImportProjectFile">
              {{ t({ en: 'Import project file...', zh: '导入项目文件...' }) }}
            </UIMenuItem>
            <UIMenuItem :disabled="props.project == null" @click="handleExportProjectFile">
              {{ t({ en: 'Export project file', zh: '导出项目文件' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup>
            <UIMenuItem :disabled="props.project == null" @click="handleImportFromScratch">
              {{ t({ en: 'Import assets from Scratch file', zh: '从 Scratch 项目文件导入' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup>
            <UIMenuItem :disabled="props.project == null || !isOnline" @click="handleShareProject">
              {{ t({ en: 'Share project', zh: '分享项目' }) }}
            </UIMenuItem>
            <UIMenuItem v-if="project?.isPublic === IsPublic.public" @click="handleStopSharingProject">
              {{ t({ en: 'Stop sharing', zh: '停止分享' }) }}
            </UIMenuItem>
          </UIMenuGroup>
        </UIMenu>
      </UIDropdown>
    </div>
    <div class="setting-dropdown">
      <NDropdown trigger="hover" :options="settingOptions" @select="handleSettingOption">
        {{ $t({ en: 'Setting', zh: '设置' }) }}
      </NDropdown>
    </div>
    <p class="project-name">{{ props.project?.name }}</p>
    <UIButton v-if="props.project != null" type="boring" :disabled="!isOnline" class="save" @click="handleSave">{{
      $t({ en: 'Save', zh: '保存' })
    }}</UIButton>
    <UserAvatar />
  </nav>
</template>

<script setup lang="ts">
// if this top-nav is for editor only, we should move it into editor
// TODO: check if the same top nav is needed for pages other than editor

import { h, computed } from 'vue'
import { NDropdown, useModal } from 'naive-ui'
import { UIButton, UIDropdown, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'
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
import UserAvatar from './UserAvatar.vue'
import LoadFromScratch from '../library/LoadFromScratch.vue'
import { parseScratchFileAssets } from '@/utils/scratch'

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

async function handleShareProject() {
  await shareProject(props.project!)
}

async function handleStopSharingProject() {
  await stopSharingProject(props.project!)
}

const toggleLanguage = useToggleLanguage()

const settingOptions = computed(() => {
  return [
    {
      key: 'switchLang',
      label: '中文/En',
      async handler() {
        toggleLanguage()
      }
    }
  ]
})

function handleSettingOption(key: string) {
  for (const option of settingOptions.value) {
    if (option.key === key) {
      option.handler()
      return
    }
  }
  throw new Error(`unknown option key: ${key}`)
}

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
  height: 34px;
  padding: 13px;
}

.logo {
  margin-right: 1em;
}

.project-dropdown,
.setting-dropdown,
.save {
  margin: 0 1em;
}

.project-name {
  margin: 0;
  flex: 1 1 0;
  text-align: center;
}
</style>
