<!--
 * @Author: Xu Ning
 * @Date: 2024-01-12 16:52:20
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-29 17:46:15
 * @FilePath: /spx-gui/src/components/top-menu/TopMenu.vue
 * @Description:
-->
<template>
  <NMenu v-model:value="activeKey" mode="horizontal" :options="menuOptions" responsive />
</template>

<script setup lang="ts">
import { h, ref } from 'vue'
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

const projectStore = useProjectStore()
const themeStyle = ref<number>(ThemeStyleType.Pink)
const themeMap = ['Pink', 'Yellow', 'Blue']
/**
 * @description: dropdown options of import/save/export
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:54:27
 */
const importOptions = [
  {
    label: 'Local',
    key: 'Local'
  },
  {
    label: 'Cloud',
    key: 'Cloud'
  },
  {
    label: 'Github',
    key: 'Github'
  }
]

const saveOptions = [
  {
    label: 'Local',
    key: 'SaveLocal'
  },
  {
    label: 'Cloud',
    key: 'SaveCloud'
  }
]

const exportOptions = [
  {
    label: 'Video',
    key: 'Video'
  },
  {
    label: 'App',
    key: 'App'
  }
]

const settingsOptions = [
  {
    label: '中文/En',
    key: 'Global'
  },
  {
    label: 'Theme',
    key: 'ThemeColor'
  }
]

// active key for route
const activeKey = ref(null)

// i18n/i10n config
const { locale, t } = useI18n({
  inheritLocale: true,
  useScope: 'global'
})
const languageStore = useLanguageStore()

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
          options: importOptions,
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
              t('top.file')
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
          options: saveOptions,
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
              t('top.save')
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
          options: exportOptions,
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
              t('top.publish')
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
          placeholder: t('top.untitled'),
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
        t('top.code')
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
        t('top.tutorial')
      ),
    key: 'tutorial-btn'
  },
  {
    label: () =>
      h(
        NDropdown,
        {
          trigger: 'hover',
          options: settingsOptions,
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
              t('top.settings')
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
 * @param {*} color2 gradient color 2
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
  console.log('key', key)
  // TODO: use for test
  if (key === 'Local') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip'
    input.click()
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      projectStore.loadFromZip(file);
    };
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
