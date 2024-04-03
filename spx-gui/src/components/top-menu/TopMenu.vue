<template>
  <div class="menu-container">
    <NMenu v-model:value="activeKey" mode="horizontal" :options="menuOptions" responsive />
  </div>
</template>

<script setup lang="ts">
// if this top-menu is for editor only, we should move it into editor
// TODO: check if the same top menu is needed for pages other than editor

import { computed, h, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NMenu, NButton, NInput, NIcon, NDropdown } from 'naive-ui'
import { FilePresentTwotone as FileIcon, SaveTwotone as SaveIcon } from '@vicons/material'
import { SettingsOutline as SettingsIcon } from '@vicons/ionicons5'
import saveAs from 'file-saver'
import { saveColor, fileColor } from '@/assets/theme'
import { useNetwork } from '@/utils/network'
import { useToggleLanguage } from '@/i18n'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useCreateProject, useChooseProject } from '@/components/project'
import type { Project } from '@/models/project'
import { editProjectRouteName } from '@/router'
import UserAvatar from './UserAvatar.vue'

const props = defineProps<{
  project: Project | null
}>()

// active key for route
const activeKey = ref(null)
const { t } = useI18n()
const { isOnline } = useNetwork()
const router = useRouter()

function openProject(projectName: string) {
  router.push({ name: editProjectRouteName, params: { projectName } })
}

/**
 * @description: dropdown options of import/save/export
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:54:27
 */
const importOptions = computed(() => [
  {
    label: t({ en: 'New project...', zh: '创建新项目' }),
    key: 'Blank'
  },
  {
    label: t({ en: 'Open project...', zh: '打开项目' }),
    key: 'Open'
  },
  {
    label: t({ en: 'Upload project', zh: '上传' }),
    key: 'Upload'
  }
])

const saveOptions = computed(() => [
  {
    label: t({ en: 'Local', zh: '本地' }),
    key: 'SaveLocal'
  },
  {
    label: t({ en: 'Cloud', zh: '云端' }),
    key: 'SaveCloud',
    disabled: !isOnline.value
  }
])

const settingsOptions = computed(() => [
  {
    label: '中文/En',
    key: 'Global'
  }
])

// default button style for menu
const buttonStyle = {
  color: '#000',
  'border-radius': '20px',
  border: '2px solid #001429',
  'box-shadow': '-1px 2px #001429',
  cursor: 'pointer'
}

const dropdownStyle = {
  'min-width': '7vw',
  'text-align': 'center'
}

/**
 * @description: top menu options render
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:53:53
 */
const menuOptions = [
  {
    label: () =>
      h(
        'div',
        {
          style: {
            color: 'white'
          }
        },
        () => 'Go+ Builder'
      ),
    key: 'logo'
  },
  {
    label: () =>
      h(
        NDropdown,
        {
          trigger: 'hover',
          options: importOptions.value,
          onSelect: handleSelectImport,
          style: dropdownStyle
        },
        {
          default: () =>
            h(
              NButton,
              {
                style: computedButtonStyle(fileColor),
                renderIcon: renderIcon(FileIcon)
              },
              () => t({ en: 'Project', zh: '项目' })
            )
        }
      ),
    key: 'import-btn'
  },
  {
    label: () =>
      h(
        NDropdown,
        {
          trigger: 'hover',
          options: saveOptions.value,
          onSelect: handleSelectImport,
          style: dropdownStyle
        },
        {
          default: () =>
            h(
              NButton,
              {
                style: computedButtonStyle(saveColor),
                renderIcon: renderIcon(SaveIcon)
              },
              () => t({ en: 'Save', zh: '保存' })
            )
        }
      ),
    key: 'save-btn'
  },
  {
    label: () =>
      h(
        NInput,
        {
          placeholder: '',
          style: {
            'border-radius': '10px',
            'text-align': 'center',
            border: '2px solid #001429',
            width: '30vw'
          },
          value: props.project?.name,
          'onUpdate:value': (value: string) => {
            if (props.project != null) props.project.name = value
          }
        },
        () => 'title'
      ),
    key: 'title-btn'
  },
  {
    label: () =>
      h(
        NDropdown,
        {
          trigger: 'hover',
          options: settingsOptions.value,
          onSelect: handleSelectSettings,
          style: dropdownStyle
        },
        {
          default: () =>
            h(
              NButton,
              {
                style: {
                  'background-color': '#3a8b3b',
                  color: '#FFF',
                  'border-radius': '20px',
                  border: '2px solid #001429',
                  'box-shadow': '-1px 2px #001429',
                  cursor: 'pointer'
                },
                renderIcon: renderIcon(SettingsIcon)
              },
              () => t({ en: 'Settings', zh: '设置' })
            )
        }
      ),
    key: 'setting-btn'
  },
  {
    label: () => h(UserAvatar),
    key: 'user-avatar'
  }
]

/**
 * @description: generate default button style for menu
 * @param {*} color1 gradient color 1
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:56:06
 */
const computedButtonStyle = (color1: string) => {
  return {
    ...buttonStyle,
    'background-color': `${color1}`
  }
}

const createProject = useCreateProject()
const chooseProject = useChooseProject()

const handleSelectImport = async (key: string | number) => {
  if (key === 'Upload') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip'
    input.click()
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (props.project != null) {
        await props.project.loadZipFile(file)
      }
    }
  } else if (key === 'Open') {
    const { name } = await chooseProject()
    openProject(name)
  } else if (key === 'SaveLocal') {
    if (props.project != null) {
      const zipFile = await props.project.exportZipFile()
      saveAs(zipFile, zipFile.name)
    }
  } else if (key === 'SaveCloud') {
    if (props.project != null) {
      await handleSaveCloud()
    }
  } else if (key === 'Blank') {
    const { name } = await createProject()
    openProject(name)
  }
}

const handleSaveCloud = useMessageHandle(
  () => props.project!.saveToCloud(),
  { en: 'Failed to save project', zh: '项目保存失败' },
  { en: 'Project saved', zh: '保存成功' }
)

const handleSelectSettings = (key: string | number) => {
  if (key === 'Global') {
    toggleLanguage()
  }
}

/**
 * @description: render top menu icon
 * @param {*} icon
 * @Author: Xu Ning
 * @Date: 2024-01-16 11:45:58
 */
function renderIcon(icon: any) {
  return () =>
    h(
      NIcon,
      {
        style: {
          'font-size': '34px'
        }
      },
      { default: () => h(icon) }
    )
}

const toggleLanguage = useToggleLanguage()
</script>

<style lang="scss" scoped>
.menu-container {
  background: #ff81a7;
  height: 34px;
  padding: 13px;
}
</style>
