<!--
 * @Author: Xu Ning
 * @Date: 2024-01-12 16:52:20
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-17 21:26:30
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
import { NMenu, NButton, NInput, NAvatar, NIcon, NDropdown } from "naive-ui";
import { useI18n } from "vue-i18n";
import { useLanguageStore } from "@/store/modules/language";
import Logo from "@/assets/logo.png";
import { ArrowLeftOutlined as ReturnIcon } from "@vicons/antd";
import {
  topMenuImportBtn1,
  topMenuImportBtn2,
  topMenuSaveBtn1,
  topMenuSaveBtn2,
  topMenuExportBtn1,
  topMenuExportBtn2,
  topMenuReturnBtn1,
  topMenuReturnBtn2,
} from "@/assets/theme.ts";

/**
 * @description: dropdown options of import/save/export
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:54:27
 */
const importOptions = [
  {
    label: "Local",
    key: "Local",
  },
  {
    label: "Cloud",
    key: "Cloud",
  },
  {
    label: "Github",
    key: "Github",
  },
];

const saveOptions = [
  {
    label: "Local",
    key: "Local",
  },
  {
    label: "Cloud",
    key: "Cloud",
  },
];

const exportOptions = [
  {
    label: "Video",
    key: "Video",
  },
  {
    label: "App",
    key: "App",
  },
];

// active key for route
const activeKey = ref(null);

// i18n/i10n config
const { locale } = useI18n({
  inheritLocale: true,
  useScope: "global",
});
const languageStore = useLanguageStore();

// default button style for menu
const buttonStyle = {
  "--n-border": "0px !important",
  "--n-border-hover": "0px !important",
  "--n-border-press": "0px !important",
  "--n-border-focus": "0px !important",
  "box-shadow": "4px 4px rgba(0, 0, 0, 0.1)",
  "min-width": "7vw",
};

const dropdownStyle = {
  "min-width": "7vw",
  "text-align" : "center"
}

/**
 * @description: topmenu options render
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:53:53
 */
const menuOptions = [
  {
    label: () =>
      h(NAvatar, {
        round: true,
        size: "large",
        src: Logo,
        style: {
          height: "34px",
          width: "34px",
        },
      }),
    key: "logo",
  },
  {
    label: () =>
      h(
        NButton,
        {
          circle: true,
          style: {
            background: `linear-gradient(145deg, ${topMenuReturnBtn1}, ${topMenuReturnBtn2})`,
            "--n-border": "0px !important",
            "--n-border-hover": "0px !important",
            "--n-border-press": "0px !important",
            "--n-border-focus": "0px !important",
            "box-shadow": "4px 4px rgba(0, 0, 0, 0.1)",
          },
        },
        renderIcon(ReturnIcon)
      ),
    key: "return-btn",
  },
  {
    label: () =>
      h(
        NDropdown,
        {
          trigger: "hover",
          options: importOptions,
          onSelect: handleSelectImport,
          style: dropdownStyle,
        },
        {
          default: () =>
            h(
              NButton,
              {
                style: computedButtonStyle(
                  topMenuImportBtn1,
                  topMenuImportBtn2
                ),
              },
              "Import"
            ),
        }
      ),
    key: "import-btn",
  },
  {
    label: () =>
      h(
        NDropdown,
        {
          trigger: "hover",
          options: saveOptions,
          onSelect: handleSelectImport,
          style : dropdownStyle
        },
        {
          default: () =>
            h(
              NButton,
              {
                style: computedButtonStyle(topMenuSaveBtn1, topMenuSaveBtn2),
              },
              "Save"
            ),
        }
      ),
    key: "save-btn",
  },
  {
    label: () =>
      h(
        NDropdown,
        {
          trigger: "hover",
          options: exportOptions,
          onSelect: handleSelectImport,
          style: dropdownStyle
        },
        {
          default: () =>
            h(
              NButton,
              {
                style: computedButtonStyle(
                  topMenuExportBtn1,
                  topMenuExportBtn2
                ),
              },
              "Export"
            ),
        }
      ),
    key: "export-btn",
  },
  {
    label: () =>
      h(
        NInput,
        {
          placeholder: "Untitled",
          style: {
            "border-radius": "25px",
            "text-align": "center",
            width: "30vw",
          },
        },
        "title"
      ),
    key: "title-btn",
  },
  {
    label: () =>
      h(
        NButton,
        {
          style: computedButtonStyle(topMenuImportBtn1, topMenuImportBtn2),
        },
        "Code"
      ),
    key: "code-btn",
  },
  {
    label: () =>
      h(
        NButton,
        {
          style: computedButtonStyle(topMenuImportBtn1, topMenuImportBtn2),
        },
        "Tutorial"
      ),
    key: "tutorial-btn",
  },
  {
    label: () =>
      h(NAvatar, {
        round: true,
        size: "large",
        src: Logo,
        style: {
          height: "34px",
          width: "34px",
        },
      }),
    key: "logo",
  },
  {
    label: () =>
      h(
        "span",
        {
          onClick: toggleLanguage,
          style: {
            cursor: "pointer",
            padding: "0 16px",
            color: "white",
          },
        },
        "En/中文"
      ),
  },
];


/**
 * @description: generate default button style for menu
 * @param {*} color1 gradient color 1
 * @param {*} color2 gradient color 2
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:56:06
 */
 const computedButtonStyle = (color1: string, color2: string) => {
  return {
    ...buttonStyle,
    background: `linear-gradient(to right, ${color1}, ${color2})`,
  };
};

/**
 * @description: import dropdown select func
 * @param {*} key
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:55:13
 */
 const handleSelectImport = (key: string | number) => {
  // message.info(String(key));
};


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
          "font-size": "34px",
        },
      },
      { default: () => h(icon) }
    );
}

/**
 * @description: toggle language function , now for Chinese and English
 * @Author: Yao xinyue
 * @Date: 2024-01-17 17:58:26
 */
const toggleLanguage = () => {
  locale.value = locale.value === "en" ? "zh" : "en";
  languageStore.setLanguage(languageStore.language === "en" ? "zh" : "en");
};
</script>

<style type="scss" scoped></style>
