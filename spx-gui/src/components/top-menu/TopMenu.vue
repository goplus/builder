<!--
 * @Author: Xu Ning
 * @Date: 2024-01-12 16:52:20
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-13 18:18:02
 * @FilePath: /spx-gui/src/components/top-menu/TopMenu.vue
 * @Description:
-->
<template>
  <NMenu v-model:value="activeKey" mode="horizontal" :options="menuOptions" responsive />
  <ProjectList :show="showModal" @update:show="showModal = false" />
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { NMenu, NButton, NInput, NIcon, NDropdown } from 'naive-ui'
import {
  FilePresentTwotone as FileIcon,
  SaveTwotone as SaveIcon
} from '@vicons/material'
import { SettingsOutline as SettingsIcon } from '@vicons/ionicons5'
import saveAs from 'file-saver'
import { saveColor, fileColor } from '@/assets/theme'
import { useProjectStore } from '@/stores'
import UserAvatar from './UserAvatar.vue'
import ProjectList from '@/components/project-list/ProjectList.vue'
import { useNetwork } from '@/utils/network'
import { useToggleLanguage } from '@/i18n'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/error'

const projectStore = useProjectStore()
const showModal = ref<boolean>(false)

// active key for route
const activeKey = ref(null)
const { t } = useI18n()
const { isOnline } = useNetwork()

/**
 * @description: dropdown options of import/save/export
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:54:27
 */
const importOptions = computed(() => [
  {
    label: t({ en: 'Upload', zh: '上传' }),
    key: 'Upload'
  },
  {
    label: t({ en: 'Load', zh: '加载' }),
    key: 'Load'
  },
  {
    label: t({ en: 'Blank', zh: '空项目' }),
    key: 'Blank'
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
              () => t({ en: 'File', zh: '文件' })
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
          value: projectStore.project.name,
          'onUpdate:value': (value: string) => {
            projectStore.project.name = value
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

/**
 * @description: import dropdown select func
 * @param {*} key
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:55:13
 */
const handleSelectImport = async (key: string | number) => {
  if (key === 'Upload') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip'
    input.click()
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      await projectStore.openProjectWithZipFile(undefined, undefined, file)
    }
  } else if (key === 'Load') {
    showModal.value = true
  } else if (key === 'SaveLocal') {
    const zipFile = await projectStore.project.exportZipFile()
    saveAs(zipFile, zipFile.name)
  } else if (key === 'SaveCloud') {
    await handleSaveCloud()
  } else if (key === 'Blank') {
    projectStore.openBlankProject(undefined, 'untitled-TODO')
  }
}

const handleSaveCloud = useMessageHandle(
  () => projectStore.project.saveToCloud(),
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

<style lang="scss" scoped></style>
