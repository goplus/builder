<!-- eslint-disable vue/no-v-html -->
<template>
  <NavbarWrapper>
    <template #left>
      <NavbarDropdown
        :trigger-radar="{
          name: 'Project menu',
          desc: 'Hover to see project options (create/open/publish/unpublish/remove project, import/export project file, import Scratch project file, import assets from Scratch, etc.)'
        }"
      >
        <template #trigger>
          <UIIcon class="w-6 h-6" type="file" />
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
            <UIMenuItem class="p-2" @click="handleImportFromScratch">
              <template #icon><img :src="importScratchSvg" /></template>
              <span class="mr-2 flex-1">
                {{ $t({ en: 'Import Scratch project file...', zh: '导入 Scratch 项目文件...' }) }}
              </span>
              <UITag>Beta</UITag>
            </UIMenuItem>
            <UIMenuItem @click="handleImportAssetsFromScratch">
              <template #icon><img :src="importAssetsScratchSvg" /></template>
              {{ $t({ en: 'Import assets from Scratch...', zh: '从 Scratch 项目文件导入素材...' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup :disabled="project == null">
            <UIMenuItem @click="handleExportProjectFile">
              <template #icon><img :src="exportProjectSvg" /></template>
              {{ $t({ en: 'Export project file', zh: '导出项目文件' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup :disabled="project == null || !isOnline">
            <UIMenuItem v-if="canManageProject" @click="handlePublishProject">
              <template #icon><img :src="publishSvg" /></template>
              {{ $t({ en: 'Publish project...', zh: '发布项目...' }) }}
            </UIMenuItem>
            <UIMenuItem
              v-if="canManageProject && project?.visibility === Visibility.Public"
              @click="handleUnpublishProject"
            >
              <template #icon><img :src="unpublishSvg" /></template>
              {{ $t({ en: 'Unpublish project', zh: '取消发布' }) }}
            </UIMenuItem>
            <UIMenuItem @click="handleOpenProjectPage">
              <template #icon><img :src="projectPageSvg" /></template>
              {{ $t({ en: 'Open project page', zh: '打开项目主页' }) }}
            </UIMenuItem>
            <UIMenuItem v-if="canManageProject" class="w-full" @click="handleModifyProjectName">
              <template #icon><img :src="modifyProjectNameSvg" /></template>
              {{ $t({ en: 'Modify project name', zh: '修改项目名' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup v-if="canManageProject" :disabled="project == null">
            <UIMenuItem @click="handleRemoveProject">
              <template #icon><img :src="removeProjectSvg" /></template>
              {{ $t({ en: 'Remove project...', zh: '删除项目...' }) }}
            </UIMenuItem>
          </UIMenuGroup>
        </UIMenu>
      </NavbarDropdown>

      <NavbarTutorials v-if="showTutorialsEntry" />

      <div class="flex">
        <UITooltip :disabled="undoAction == null">
          <template #trigger>
            <button class="history-button" :disabled="undoAction == null" @click="handleUndo.fn">
              <UIIcon class="w-6 h-6" type="undo" />
            </button>
          </template>
          <span>{{ $t(undoText) }}</span>
        </UITooltip>
        <UITooltip :disabled="redoAction == null">
          <template #trigger>
            <button class="history-button" :disabled="redoAction == null" @click="handleRedo.fn">
              <UIIcon class="w-6 h-6" type="redo" />
            </button>
          </template>
          <span>{{ $t(redoText) }}</span>
        </UITooltip>
      </div>
    </template>
    <template #center>
      <template v-if="project != null">
        <EditorProjectDisplayName
          :project="project"
          :can-edit="canEditProjectDisplayName"
          :owner-display-name="ownerInfoToDisplay?.displayName ?? null"
          :auto-save-state-icon="autoSaveStateIcon"
        />
      </template>
    </template>
    <template #right>
      <UIButtonGroup
        v-radar="{ name: 'Editor mode menu', desc: 'Hover to see editor mode options (default, map)' }"
        class="mx-3 items-center"
        type="text"
        variant="secondary"
        :value="selectedEditMode"
        @update:value="(v) => state?.selectEditMode(v as EditMode)"
      >
        <UITooltip>
          <template #trigger>
            <UIButtonGroupItem
              v-radar="{
                name: 'Default mode',
                desc: 'Editor for defining the behavior and resources of independent entities (Sprites, Sounds, Stage). It features code editing, internal resource (Costumes, Animations, Backdrops, Widgets) management, and game running/debugging'
              }"
              :value="EditMode.Default"
            >
              <div class="w-4.5 flex [&_svg]:block [&_svg]:h-auto [&_svg]:w-full" v-html="defaultModeSvg"></div>
            </UIButtonGroupItem>
          </template>
          {{ $t({ en: 'Default mode', zh: '默认模式' }) }}
        </UITooltip>
        <UITooltip>
          <template #trigger>
            <UIButtonGroupItem
              v-radar="{
                name: 'Map edit mode',
                desc: 'Map-centric editor for the game\'s spatial arrangement. It features sprite placement on the stage and global configuration (map size, physics, layer sorting, etc.)'
              }"
              :value="EditMode.Map"
            >
              <div class="w-4.5 flex [&_svg]:block [&_svg]:h-auto [&_svg]:w-full" v-html="mapEditModeSvg"></div>
            </UIButtonGroupItem>
          </template>
          {{ $t({ en: 'Map edit mode', zh: '地图编辑模式' }) }}
        </UITooltip>
      </UIButtonGroup>
    </template>
  </NavbarWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import saveAs from 'file-saver'
import {
  UIMenu,
  UIMenuGroup,
  UIMenuItem,
  UIIcon,
  UITooltip,
  useConfirmDialog,
  useMessage,
  UIButtonGroup,
  UIButtonGroupItem,
  UITag
} from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { getProjectEditorRouteParams } from '@/utils/project-route'
import { selectFile } from '@/utils/file'
import { convertScratchToXbp } from '@/apis/sb2xbp'
import { type SpxProject } from '@/models/spx/project'
import { useSignedInUser, useUser } from '@/stores/user'
import { Visibility } from '@/apis/common'
import { getProjectPageRoute } from '@/router'
import { showTutorialsEntry } from '@/utils/env'
import { useModifyProjectName, usePublishProject, useRemoveProject, useUnpublishProject } from '@/components/project'
import { useLoadFromScratchModal } from '@/components/asset'
import { xbpHelpers } from '@/models/common/xbp'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'
import NavbarDropdown from '@/components/navbar/NavbarDropdown.vue'
import NavbarNewProjectItem from '@/components/navbar/NavbarNewProjectItem.vue'
import NavbarOpenProjectItem from '@/components/navbar/NavbarOpenProjectItem.vue'
import NavbarTutorials from '@/components/navbar/NavbarTutorials.vue'
import EditorProjectDisplayName from './EditorProjectDisplayName.vue'
import { SavingState, EditingMode } from '../editing'
import { EditMode, type EditorState } from '../editor-state'
import importProjectSvg from './icons/import-project.svg'
import exportProjectSvg from './icons/export-project.svg'
import removeProjectSvg from './icons/remove-project.svg'
import modifyProjectNameSvg from './icons/modify-project-name.svg'
import importScratchSvg from './icons/import-scratch.svg'
import importAssetsScratchSvg from './icons/import-assets-scratch.svg'
import publishSvg from './icons/publish.svg'
import unpublishSvg from './icons/unpublish.svg'
import projectPageSvg from './icons/project-page.svg'
import offlineSvg from './icons/offline.svg?raw'
import savingSvg from './icons/saving.svg?raw'
import failedToSaveSvg from './icons/failed-to-save.svg?raw'
import cloudCheckSvg from './icons/cloud-check.svg?raw'
import defaultModeSvg from './icons/default-mode.svg?raw'
import mapEditModeSvg from './icons/map-edit-mode.svg?raw'

const props = defineProps<{
  project: SpxProject | null
  state: EditorState | null
}>()

const { isOnline } = useNetwork()
const i18n = useI18n()
const router = useRouter()
const confirm = useConfirmDialog()
const signedInUser = useSignedInUser()
const canManageProject = computed(() => {
  const signedInUsername = signedInUser.value?.username
  if (signedInUsername == null || props.project == null) return false
  return props.project.owner === signedInUsername
})

const projectOwnerRet = useUser(() => props.project?.owner ?? null)

const selectedEditMode = computed(() => props.state?.selectedEditMode ?? EditMode.Default)

const ownerInfoToDisplay = computed(() => {
  const owner = projectOwnerRet.data.value
  if (owner == null) return null
  const signedInUsername = signedInUser.value?.username
  if (signedInUsername == null || signedInUsername !== owner.username) return owner
  return null
})

const importProjectFileMessage = { en: 'Import project file', zh: '导入项目文件' }

const handleImportProjectFile = useMessageHandle(
  async () => {
    const { project, state } = props
    if (project == null) throw new Error('No project to import into')
    if (state == null) throw new Error('Editor state expected')
    await confirm({
      title: i18n.t(importProjectFileMessage),
      content: i18n.t({
        en: 'Existing content of current project will be replaced with imported content. Are you sure to continue?',
        zh: '当前项目中的内容将被导入项目文件的内容覆盖，确定继续吗？'
      }),
      confirmText: i18n.t({ en: 'Continue', zh: '继续' })
    })
    const file = await selectFile({ accept: ['xbp', 'gbp' /** For backward compatibility */] })
    const action = { name: importProjectFileMessage }
    await m.withLoading(
      state.history.doAction(action, async () => {
        const serialized = await xbpHelpers.load(file)
        await project.load(serialized)
      }),
      i18n.t({ en: 'Importing project file', zh: '导入项目文件中' })
    )
  },
  { en: 'Failed to import project file', zh: '导入项目文件失败' }
).fn

const m = useMessage()

const handleExportProjectFile = useMessageHandle(
  async () => {
    const project = props.project
    if (project == null) throw new Error('No project to export')
    const signal = project.getSignal()
    const xbpFile = await m.withLoading(
      project.export(signal).then((serialized) => xbpHelpers.save(serialized, signal)),
      i18n.t({ en: 'Exporting project file', zh: '导出项目文件中' })
    )
    saveAs(xbpFile, xbpFile.name) // TODO: what if user cancelled download?
  },
  { en: 'Failed to export project file', zh: '导出项目文件失败' }
).fn

const loadFromScratchModal = useLoadFromScratchModal()
const handleImportAssetsFromScratch = useMessageHandle(
  async () => {
    const { state, project } = props
    if (state == null || project == null) throw new Error('Editor state or project is not available')
    const added = await loadFromScratchModal(project)
    state.selectResource(added[0])
  },
  {
    en: 'Failed to import from Scratch file',
    zh: '从 Scratch 项目文件导入失败'
  }
).fn

const importScratchMessage = { en: 'Import Scratch project file', zh: '导入 Scratch 项目文件' }
const handleImportFromScratch = useMessageHandle(
  async () => {
    const { project, state } = props
    if (project == null) throw new Error('project is not available')
    if (state == null) throw new Error('Editor state is not available')
    // select Scratch project file (.sb2 or .sb3)
    const file = await selectFile({ accept: ['sb3', 'sb2'] })

    // upload to backend via api helper and get converted xbp blob
    const blob = await m.withLoading(
      convertScratchToXbp(file, project.getSignal()),
      i18n.t({ en: 'Converting Scratch project file', zh: '正在转换 Scratch 项目文件' })
    )

    if (blob == null) throw new Error('Failed to convert Scratch project')

    const xbpFile = new File([blob], `${file.name.replace(/\.sb(2|3)$/i, '')}.xbp`, {
      type: 'application/zip'
    })

    const action = { name: importScratchMessage }
    await m.withLoading(
      state.history.doAction(action, async () => {
        const serialized = await xbpHelpers.load(xbpFile)
        await project.load(serialized)
      }),
      i18n.t({ en: 'Importing converted project file', zh: '导入已转换的项目文件' })
    )
  },
  { en: 'Failed to import Scratch project file', zh: '导入 Scratch 项目文件失败' }
).fn

const publishProject = usePublishProject()
const handlePublishProject = useMessageHandle(() => publishProject(props.project!), {
  en: 'Failed to publish project',
  zh: '发布项目失败'
}).fn

const modifyProjectName = useModifyProjectName()
const handleModifyProjectName = useMessageHandle(
  async () => {
    const project = props.project
    if (project == null) throw new Error('project is not available')
    const previousName = project.name
    const nextName = await modifyProjectName(project)
    if (nextName == null) return
    if (nextName !== previousName && project.owner != null) {
      const currentRoute = router.currentRoute.value
      router.replace({
        params: getProjectEditorRouteParams(currentRoute.params, { owner: project.owner, name: nextName }),
        query: currentRoute.query
      })
    }
  },
  { en: 'Failed to modify project name', zh: '修改项目名失败' }
).fn

const canEditProjectDisplayName = computed(() => canManageProject.value && isOnline.value)

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
    await removeProject(props.project!.owner!, props.project!.name!, props.project!.displayName)
    router.push('/')
  },
  { en: 'Failed to remove project', zh: '删除项目失败' }
).fn

const undoAction = computed(() => props.state?.history.getUndoAction())

const undoText = computed(() => ({
  en: undoAction.value != null ? `Undo "${undoAction.value.name.en}"` : 'Undo',
  zh: undoAction.value != null ? `撤销“${undoAction.value.name.zh}”` : '撤销'
}))

const redoAction = computed(() => props.state?.history.getRedoAction())

const redoText = computed(() => ({
  en: redoAction.value != null ? `Redo "${redoAction.value.name.en}"` : 'Redo',
  zh: redoAction.value != null ? `重做“${redoAction.value.name.zh}”` : '重做'
}))

const handleUndo = useMessageHandle(() => props.state?.history.undo(), {
  en: 'Failed to undo',
  zh: '撤销操作失败'
})

const handleRedo = useMessageHandle(() => props.state?.history.redo(), {
  en: 'Failed to redo',
  zh: '重做操作失败'
})

type AutoSaveStateIcon = {
  svg: string
  stateClass?: string
  desc: LocaleMessage
}

const autoSaveStateIcon = computed<AutoSaveStateIcon | null>(() => {
  const editing = props.state?.editing
  if (editing == null) return null
  switch (editing.mode) {
    case EditingMode.EffectFree:
      return null // TODO: style for effect-free mode
    case EditingMode.AutoSave: {
      if (!isOnline.value) return { svg: offlineSvg, desc: { en: 'No internet connection', zh: '无网络连接' } }
      if (!editing.dirty || editing.saving == null) return { svg: cloudCheckSvg, desc: { en: 'Saved', zh: '已保存' } }
      switch (editing.saving.state) {
        case SavingState.Pending:
          return {
            svg: savingSvg,
            stateClass: 'pending',
            desc: { en: 'Pending save', zh: '待保存' }
          }
        case SavingState.InProgress:
          return { svg: savingSvg, stateClass: 'saving', desc: { en: 'Saving', zh: '保存中' } }
        case SavingState.Completed:
          return { svg: cloudCheckSvg, desc: { en: 'Saved', zh: '已保存' } }
        case SavingState.Failed:
          return { svg: failedToSaveSvg, desc: { en: 'Failed to save', zh: '保存失败' } }
        default:
          throw new Error('unknown saving state')
      }
    }
    default:
      throw new Error(`Unknown editing mode: ${editing.mode}`)
  }
})
</script>

<style scoped>
@reference "../../../app.css";

.history-button {
  @apply flex h-full items-center justify-center border-none bg-transparent px-5 text-white outline-none;
}

.history-button:disabled {
  @apply cursor-not-allowed text-[#9de6ec];
}

.history-button:enabled:hover {
  @apply cursor-pointer bg-primary-600;
}
</style>
