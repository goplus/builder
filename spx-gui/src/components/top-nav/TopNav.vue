<template>
  <nav class="top-nav">
    <span class="logo">Go+ Builder</span>
    <div class="project-dropdown">
      <NDropdown trigger="hover" :options="projectOptions" @select="handleProjectOption">
        {{ _t({ en: 'Project', zh: '项目' }) }}
      </NDropdown>
    </div>
    <div class="setting-dropdown">
      <NDropdown trigger="hover" :options="settingOptions" @select="handleSettingOption">
        {{ _t({ en: 'Setting', zh: '设置' }) }}
      </NDropdown>
    </div>
    <p class="project-name">{{ props.project?.name }}</p>
    <NButton v-if="props.project != null" class="save" @click="handleSave">{{ _t({ en: 'Save', zh: '保存' }) }}</NButton>
    <UserAvatar />
  </nav>
</template>

<script setup lang="ts">
// if this top-nav is for editor only, we should move it into editor
// TODO: check if the same top nav is needed for pages other than editor

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NDropdown, NButton } from 'naive-ui'
import saveAs from 'file-saver'
import { useNetwork } from '@/utils/network'
import { useToggleLanguage } from '@/i18n'
import { useI18n } from '@/utils/i18n'
import { Cancelled, useMessageHandle } from '@/utils/exception'
import { IsPublic } from '@/apis/common'
import { getProjectEditorRoute } from '@/router'
import type { Project } from '@/models/project'
import { useCreateProject, useChooseProject, useSaveAndShareProject, useStopSharingProject } from '@/components/project'
import UserAvatar from './UserAvatar.vue'

const props = defineProps<{
  project: Project | null
}>()

const { t } = useI18n()
const { isOnline } = useNetwork()
const router = useRouter()

const createProject = useCreateProject()
const chooseProject = useChooseProject()
const shareProject = useSaveAndShareProject()
const stopSharingProject = useStopSharingProject()

function openProject(projectName: string) {
  router.push(getProjectEditorRoute(projectName))
}

const projectOptions = computed(() => {
  const options = [
    {
      key: 'newProject',
      label: t({ en: 'New project', zh: '新建项目' }),
      disabled: !isOnline.value,
      async handler() {
        const { name } = await createProject()
        openProject(name)
      }
    },
    {
      key: 'openProject',
      label: t({ en: 'Open project...', zh: '打开项目...' }),
      disabled: !isOnline.value,
      async handler() {
        const { name } = await chooseProject()
        openProject(name)
      }
    },
    {
      key: 'importProjectFile',
      label: t({ en: 'Import project file...', zh: '导入项目文件...' }),
      disabled: props.project == null,
      async handler() {
        const file = await selectFile()
        await props.project!.loadZipFile(file)
      }
    },
    {
      key: 'exportProjectFile',
      label: t({ en: 'Export project file...', zh: '导出项目文件' }),
      disabled: props.project == null,
      async handler() {
        const zipFile = await props.project!.exportZipFile()
        saveAs(zipFile, zipFile.name) // TODO: what if user cancelled download?
      }
    },
    {
      key: 'shareProject',
      label: t({ en: 'Share project', zh: '分享项目' }),
      disabled: props.project == null || !isOnline.value,
      async handler() {
        await shareProject(props.project!)
      }
    }
  ]
  if (props.project?.isPublic === IsPublic.public) {
    options.push({
      key: 'stopSharingProject',
      label: t({ en: 'Stop sharing', zh: '停止分享' }),
      disabled: !isOnline.value,
      async handler() {
        await stopSharingProject(props.project!)
      }
    })
  }
  return options
})

function handleProjectOption(key: string) {
  for (const option of projectOptions.value) {
    if (option.key === key) {
      option.handler()
      return
    }
  }
  throw new Error(`unknown option key: ${key}`)
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

/** Invoke file-select for the user */
function selectFile() {
  return new Promise<File>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip'
    input.click()
    // TODO: dispose input?
    input.onchange = async () => {
      if (input.files?.[0] == null) {
        reject(new Cancelled())
        return
      }
      const file = input.files[0]
      resolve(file)
    }
  })
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

  background: #ff81a7;
  height: 34px;
  padding: 13px;
}

.logo {
  margin-right: 1em;
}

.project-dropdown, .setting-dropdown, .save {
  margin: 0 1em;
}

.project-name {
  margin: 0;
  flex: 1 1 0;
  text-align: center;
}
</style>
