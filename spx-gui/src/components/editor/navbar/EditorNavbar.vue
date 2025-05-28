<!-- eslint-disable vue/no-v-html -->
<template>
  <NavbarWrapper>
    <template #left>
      <NavbarDropdown>
        <template #trigger>
          <UIIcon type="file" />
        </template>
        <UIMenu>
          <UIMenuGroup :disabled="!isOnline">
            <NavbarNewProjectItem />
            <NavbarOpenProjectItem />
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
            <UIMenuItem @click="handlePublishProject">
              <template #icon><img :src="publishSvg" /></template>
              {{ $t({ en: 'Publish project', zh: '发布项目' }) }}
            </UIMenuItem>
            <UIMenuItem v-if="project?.visibility === Visibility.Public" @click="handleUnpublishProject">
              <template #icon><img :src="unpublishSvg" /></template>
              {{ $t({ en: 'Unpublish project', zh: '取消发布' }) }}
            </UIMenuItem>
            <UIMenuItem @click="handleOpenProjectPage">
              <template #icon><img :src="projectPageSvg" /></template>
              {{ $t({ en: 'Open project page', zh: '打开项目主页' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup :disabled="project == null">
            <UIMenuItem @click="handleRemoveProject">
              <template #icon><img :src="removeProjectSvg" /></template>
              {{ $t({ en: 'Remove project', zh: '删除项目' }) }}
            </UIMenuItem>
          </UIMenuGroup>
        </UIMenu>
      </NavbarDropdown>
      <NavbarDropdown v-if="project != null">
        <template #trigger>
          <UIIcon type="clock" />
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
      </NavbarDropdown>
    </template>
    <template #center>
      <template v-if="project != null">
        <div class="project-name">{{ project.name }}</div>
        <div class="auto-save-state">
          <UITooltip placement="right">
            <template #trigger>
              <div :class="['icon', autoSaveStateIcon.stateClass]" v-html="autoSaveStateIcon.svg"></div>
            </template>
            {{ $t(autoSaveStateIcon.desc) }}
          </UITooltip>
        </div>
      </template>
    </template>
    <template #right>
      <div v-show="project != null" class="publish">
        <UIButton type="secondary" :disabled="!isOnline" @click="handlePublishProject">
          {{ $t({ en: 'Publish', zh: '发布' }) }}
        </UIButton>
      </div>
    </template>
  </NavbarWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import saveAs from 'file-saver'
import { UIMenu, UIMenuGroup, UIMenuItem, UIIcon, UITooltip, useConfirmDialog, UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { selectFile } from '@/utils/file'
import { AutoSaveToCloudState, type Project } from '@/models/project'
import { Visibility } from '@/apis/common'
import { getProjectPageRoute } from '@/router'
import { usePublishProject, useRemoveProject, useUnpublishProject } from '@/components/project'
import { useLoadFromScratchModal } from '@/components/asset'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'
import NavbarDropdown from '@/components/navbar/NavbarDropdown.vue'
import NavbarNewProjectItem from '@/components/navbar/NavbarNewProjectItem.vue'
import NavbarOpenProjectItem from '@/components/navbar/NavbarOpenProjectItem.vue'
import undoSvg from './icons/undo.svg'
import redoSvg from './icons/redo.svg'
import importProjectSvg from './icons/import-project.svg'
import exportProjectSvg from './icons/export-project.svg'
import removeProjectSvg from './icons/remove-project.svg'
import importScratchSvg from './icons/import-scratch.svg'
import publishSvg from './icons/publish.svg'
import unpublishSvg from './icons/unpublish.svg'
import projectPageSvg from './icons/project-page.svg'
import offlineSvg from './icons/offline.svg?raw'
import savingSvg from './icons/saving.svg?raw'
import failedToSaveSvg from './icons/failed-to-save.svg?raw'
import cloudCheckSvg from './icons/cloud-check.svg?raw'

const props = defineProps<{
  project: Project | null
}>()

const { isOnline } = useNetwork()
const i18n = useI18n()
const router = useRouter()

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
    const file = await selectFile({ accept: ['gbp'] })
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

const publishProject = usePublishProject()
const handlePublishProject = useMessageHandle(() => publishProject(props.project!), {
  en: 'Failed to publish project',
  zh: '发布项目失败'
}).fn

const unpublishProject = useUnpublishProject()
const handleUnpublishProject = useMessageHandle(
  () => unpublishProject(props.project!),
  {
    en: 'Failed to unpublish project',
    zh: '取消发布失败'
  },
  {
    en: 'Project unpublished',
    zh: '已取消发布'
  }
).fn

function handleOpenProjectPage() {
  const { owner, name } = props.project!
  if (owner == null || name == null) throw new Error('project owner or name is null')
  window.open(getProjectPageRoute(owner, name))
}

const removeProject = useRemoveProject()
const handleRemoveProject = useMessageHandle(
  async () => {
    await removeProject(props.project!.owner!, props.project!.name!)
    router.push('/')
  },
  { en: 'Failed to remove project', zh: '删除项目失败' }
).fn

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

type AutoSaveStateIcon = {
  svg: string
  stateClass?: string
  desc: LocaleMessage
}
const autoSaveStateIcon = computed<AutoSaveStateIcon>(() => {
  if (!isOnline.value) return { svg: offlineSvg, desc: { en: 'No internet connection', zh: '无网络连接' } }
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
</script>

<style lang="scss" scoped>
.project-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 16px;
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

.publish {
  margin-right: 2px;
  height: 100%;
  display: flex;
  align-items: center;
}
</style>
