<!--
 * @Author: Xu Ning
 * @Date: 2024-01-12 16:52:20
 * @LastEditors: Yao xinyue
 * @LastEditTime: 2024-01-17 11:45:35
 * @FilePath: /spx-gui-front-private/src/components/top-menu/TopMenu.vue
 * @Description:
-->
<template>
  <NMenu
      v-model:value="activeKey"
      mode="horizontal"
      :options="menuOptions"
      responsive
  />
</template>

<script setup lang="ts">
import { h, ref } from "vue";
import { NMenu, NButton, NInput } from "naive-ui";
import { useI18n } from "vue-i18n";
import {useLanguageStore} from "store/modules/language";

const menuOptions = [
  {
    label: () => h(NButton, {}, "logo"),
    key: "hear-the-wind-sing",
  },
  {
    label: () =>
        h(
            NButton,
            {
              style: {
                // width: "53px",
              },
            },
            "ret"
        ),
    key: "hear-the-wind-sing",
  },
  {
    label: () =>
        h(
            NButton,
            {
              style: {
                // width: "53px",
              },
            },
            "import"
        ),
    key: "hear-the-wind-sing",
  },
  {
    label: () =>
        h(
            NButton,
            {
              style: {
                // width: "53px",
              },
            },
            "save"
        ),
    key: "hear-the-wind-sing",
  },
  {
    label: () =>
        h(
            NButton,
            {
              style: {
                // width: "53px",
              },
            },
            "export"
        ),
    key: "hear-the-wind-sing",
  },
  {
    label: () =>
        h(
            NInput,
            {
              style: {
                // width: "53px",
              },
            },
            "title"
        ),
    key: "hear-the-wind-sing",
  },
  {
    label: () =>
        h(
            NButton,
            {
              style: {
                // width: "53px",
              },
            },
            "code"
        ),
    key: "hear-the-wind-sing",
  },
  {
    label: () =>
        h(
            NButton,
            {
              style: {
                // width: "53px",
              },
            },
            "tutorial"
        ),
    key: "hear-the-wind-sing",
  },
  {
    label: () =>
        h(
            NButton,
            {
              style: {
                // width: "53px",
              },
            },
            "ava"
        ),
    key: "hear-the-wind-sing",
  },
  {
    label: () => h(
        'span',
        {
          onClick: toggleLanguage,
          style: {
            cursor: 'pointer',
            padding: '0 16px',
            color: 'white'
          },
        },
        "En/中文"
    )
  }
];
const activeKey = ref(null);

/**
 * @description: render top menu icon
 * @param {*} icon
 * @Author: Xu Ning
 * @Date: 2024-01-16 11:45:58
 */
// function renderIcon(icon) {
//   return () => h(NIcon, null, { default: () => h(icon) });
// }

// i18n/i10n config
const { locale } = useI18n({
  inheritLocale: true,
  useScope: 'global'
});
const languageStore = useLanguageStore();
const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'zh' : 'en';
  languageStore.setLanguage(languageStore.language === 'en' ? 'zh' : 'en');
};

</script>

<style type="scss" scoped>
</style>
