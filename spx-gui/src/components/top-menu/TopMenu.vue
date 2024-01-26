<!--
 * @Author: Xu Ning
 * @Date: 2024-01-12 16:52:20
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-26 23:02:17
 * @FilePath: /builder/spx-gui/src/components/top-menu/TopMenu.vue
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
import {
  ComputerTwotone as CodeIcon,
  FilePresentTwotone as FileIcon,
  SaveTwotone as SaveIcon,
  PublishTwotone as PublishIcon,
} from "@vicons/material";
import { Book as TutorialIcon } from "@vicons/ionicons5";
import {
  topMenuImportBtn1,
  topMenuImportBtn2,
  topMenuSaveBtn1,
  topMenuSaveBtn2,
  topMenuExportBtn1,
  topMenuExportBtn2,
} from "@/assets/theme.ts";
import { useProjectStore } from "@/store/modules/project";
const projectStore = useProjectStore();

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

// theme style config
import { ThemeStyleType } from "@/constant/constant.ts";

const themeStyle = ref<number>(ThemeStyleType.Pink);
const themeMap = ["Pink", "Yellow", "Blue"];

// default button style for menu
const buttonStyle = {
  "--n-border": "0px !important",
  "--n-border-hover": "0px !important",
  "--n-border-press": "0px !important",
  "--n-border-focus": "0px !important",
  "box-shadow": "4px 4px rgba(0, 0, 0, 0.1)",
  "min-width": "7vw",
  "border-radius": "20px",
};

const dropdownStyle = {
  "min-width": "7vw",
  "text-align": "center",
};

/**
 * @description: top menu options render
 * @Author: Xu Ning
 * @Date: 2024-01-17 17:53:53
 */
const menuOptions = [
  {
    label: () =>
      h(
        "div",
        {
          style: {
            color: "white",
          },
        },
        "SPX+",
      ),
    key: "logo",
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
                  topMenuImportBtn2,
                ),
                renderIcon: renderIcon(FileIcon),
              },
              "File",
            ),
        },
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
          style: dropdownStyle,
        },
        {
          default: () =>
            h(
              NButton,
              {
                style: computedButtonStyle(topMenuSaveBtn1, topMenuSaveBtn2),
                renderIcon: renderIcon(SaveIcon),
              },
              "Save",
            ),
        },
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
          style: dropdownStyle,
        },
        {
          default: () =>
            h(
              NButton,
              {
                style: computedButtonStyle(
                  topMenuExportBtn1,
                  topMenuExportBtn2,
                ),
                renderIcon: renderIcon(PublishIcon),
              },
              "Publish",
            ),
        },
      ),
    key: "publish-btn",
  },
  {
    label: () =>
      h(
        NInput,
        {
          placeholder: "Untitled",
          style: {
            "border-radius": "10px",
            "text-align": "center",
            border: "2px solid #001429",
            width: "30vw",
          },
        },
        "title",
      ),
    key: "title-btn",
  },
  {
    label: () =>
      h(
        NButton,
        {
          style: {
            "background-color": "#FFF8CC",
            color: "#000",
            "border-radius": "20px",
            border: "2px solid #001429",
            "box-shadow": "-1px 2px #001429",
            cursor: "pointer",
          },
          renderIcon: renderIcon(CodeIcon),
        },
        "Code",
      ),
    key: "code-btn",
  },
  {
    label: () =>
      h(
        NButton,
        {
          style: {
            "background-color": "#00509D",
            color: "#FFF",
            "border-radius": "20px",
            border: "2px solid #001429",
            "box-shadow": "-1px 2px #001429",
            cursor: "pointer",
          },
          renderIcon: renderIcon(TutorialIcon),
        },
        "Tutorial",
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
        "En/中文",
      ),
  },
  {
    label: () =>
      h(
        "span",
        {
          onClick: toggleThemeStyle,
          style: {
            cursor: "pointer",
            padding: "0 16px",
            color: "white",
          },
        },
        { default: () => themeMap[themeStyle.value] },
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
  console.log("key", key);
  // TODO: use for test
  if (key === "Local") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";
    input.click();
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      const dir = await projectStore.getDirPathFromZip(file);
      projectStore.loadProject(dir);
      // must set window.project_path
      window.project_path = projectStore.project.title;
      await projectStore.saveByProject();
    };
  }
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
      { default: () => h(icon) },
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

/**
 * @description:
 * @Author: Xu Ning
 * @Date: 2024-01-26 22:49:59
 */
const toggleThemeStyle = () => {
  themeStyle.value = ++themeStyle.value % 3;
  //TODO: change the style
};
</script>

<style lang="scss" scoped></style>
