<!--
 * @Author: Xu Ning
 * @Date: 2024-01-12 16:52:20
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-11 18:49:37
 * @FilePath: /spx-gui/src/components/top-menu/TopMenu.vue
 * @Description:
-->
<template>
  <NMenu v-model:value="activeKey" mode="horizontal" :options="menuOptions" responsive />
  <ProjectList :show="showModal" @update:show="showModal = false" />
</template>

<script setup lang="ts">
import {computed, h, ref} from 'vue'
import { NMenu, NButton, NInput, NIcon, NDropdown, createDiscreteApi } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useLanguageStore } from '@/store/modules/language'
import {
  ComputerTwotone as CodeIcon,
  FilePresentTwotone as FileIcon,
  SaveTwotone as SaveIcon,
  PublishTwotone as PublishIcon
} from '@vicons/material'
import { Book as TutorialIcon, SettingsOutline as SettingsIcon } from '@vicons/ionicons5'
import { publishColor, saveColor, fileColor, codeColor } from '@/assets/theme'
import { useProjectStore } from '@/store/modules/project'
import { ThemeStyleType } from '@/constant/constant'
import UserAvatar from './UserAvatar.vue'
import ProjectList from '@/components/project-list/ProjectList.vue'
import { useNetworkStore } from "@/store/modules/network";

const projectStore = useProjectStore()
const showModal = ref<boolean>(false)
const themeStyle = ref<number>(ThemeStyleType.Pink)

// active key for route
const activeKey = ref(null)

// i18n/i10n config
const { locale, t } = useI18n({
  inheritLocale: true,
  useScope: 'global'
})
const languageStore = useLanguageStore()
const networkStore = useNetworkStore()

/**
 * @description: dropdown options of import/save/export
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:54:27
 */
const importOptions = computed(() => [
  {
    label: t('topMenu.upload'),
    key: 'Upload'
  },
  {
    label: t('topMenu.load'),
    key: 'Load'
  },
  {
    label: t('topMenu.blank'),
    key: 'Blank'
  }
])

const saveOptions = computed(() =>[
  {
    label: t('topMenu.local'),
    key: 'SaveLocal'
  },
  {
    label: t('topMenu.cloud'),
    key: 'SaveCloud',
    disabled: networkStore.offline()
  }
])

const exportOptions = computed(() => [
  {
    label: t('topMenu.video'),
    key: 'Video',
    disabled: networkStore.offline()
  },
  {
    label: t('topMenu.app'),
    key: 'App',
    disabled: networkStore.offline()
  }
])

const settingsOptions = computed(() => [
  {
    label: '中文/En',
    key: 'Global'
  },
  {
    label: t('topMenu.theme'),
    key: 'ThemeColor'
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
        'SPX+'
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
              t('topMenu.file')
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
          style: dropdownStyle,
        },
        {
          default: () =>
            h(
              NButton,
              {
                style: computedButtonStyle(saveColor),
                renderIcon: renderIcon(SaveIcon)
              },
              t('topMenu.save')
            )
        }
      ),
    key: 'save-btn'
  },
  {
    label: () =>
      h(
        NDropdown,
        {
          trigger: 'hover',
          options: exportOptions.value,
          onSelect: handleSelectImport,
          style: dropdownStyle
        },
        {
          default: () =>
            h(
              NButton,
              {
                style: computedButtonStyle(publishColor),
                renderIcon: renderIcon(PublishIcon)
              },
              t('topMenu.publish')
            )
        }
      ),
    key: 'publish-btn'
  },
  {
    label: () =>
      h(
        NInput,
        {
          placeholder: t('topMenu.untitled'),
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
        'title'
      ),
    key: 'title-btn'
  },
  {
    label: () =>
      h(
        NButton,
        {
          style: computedButtonStyle(codeColor),
          renderIcon: renderIcon(CodeIcon)
        },
        t('topMenu.code')
      ),
    key: 'code-btn'
  },
  {
    label: () =>
      h(
        NButton,
        {
          style: {
            'background-color': '#00509D',
            color: '#FFF',
            'border-radius': '20px',
            border: '2px solid #001429',
            'box-shadow': '-1px 2px #001429',
            cursor: 'pointer'
          },
          renderIcon: renderIcon(TutorialIcon)
        },
        t('topMenu.tutorial')
      ),
    key: 'tutorial-btn'
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
              t('topMenu.settings')
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
const handleSelectImport = (key: string | number) => {
  // TODO: use for test
  if (key === 'Upload') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip'
    input.click()
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      await projectStore.loadFromZip(file);
    };
  }
  else if (key === 'Load') {
    showModal.value = true
  }
  else if (key === 'SaveLocal') {
    projectStore.project.download();
  }
  else if (key === 'SaveCloud') {
    const { message } = createDiscreteApi(['message'])
    projectStore.project.save().then((res) => {
      message.success(res)
    }).catch((err) => {
      console.error(err)
      if (err instanceof Error) {
        message.error(err.message)
      }
    })
  }
  else if(key === 'Blank') {
    projectStore.loadBlankProject()
  }
}

const handleSelectSettings = (key: string | number) => {
  if (key === 'Global') {
    toggleLanguage()
  } else if (key === 'ThemeColor') {
    toggleThemeStyle()
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

/**
 * @description: toggle language function , now for Chinese and English
 * @Author: Yao xinyue
 * @Date: 2024-01-17 17:58:26
 */
const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'zh' : 'en'
  languageStore.setLanguage(languageStore.language === 'en' ? 'zh' : 'en')
}

/**
 * @description:
 * @Author: Xu Ning
 * @Date: 2024-01-26 22:49:59
 */
const toggleThemeStyle = () => {
  themeStyle.value = ++themeStyle.value % 3
  //TODO: change the style
}
</script>

<style lang="scss" scoped></style>
