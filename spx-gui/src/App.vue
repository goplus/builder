<!--
 * @Author: Xu Ning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-16 08:59:50
 * @FilePath: /workspace/builder/spx-gui/src/App.vue
 * @Description: 
-->
<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-layout>
      <n-layout-header>
        <TopMenu />
      </n-layout-header>
      <n-layout-content content-style="padding: 24px;">
        <router-view></router-view>
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<script setup lang="ts">
import {
  NConfigProvider,
  NLayout,
  NLayoutHeader,
  NLayoutContent,
} from "naive-ui";
import TopMenu from "@/components/top-menu/TopMenu.vue";
/**
 * @description: Override spx-gui theme
 * @return {*}
 */
const themeOverrides = {
  common: {
    primaryColor: "#FF0000",
    fontWeightStrong: "600",
  },
  Button: {
    color: "#ED729EFF",
    colorHover: "#FF7CB5FF",
    colorPressed: "#F1518AFF",
    colorFocus: "#F1518AFF",
    colorDisabled: "#0000",
    textColorHover: "#FFFFFFFF",
    textColorPressed: "#FFFFFFFF",
    textColorFocus: "#FFFFFFFF",
    textColor: "rgba(255, 255, 255, 1)",
    borderHover: "1px solid #FF7CB5FF",
    borderPressed: "1px solid #F1518AFF",
    borderFocus: "1px solid #F1518AFF",
    borderRadiusTiny: "25px",
    borderRadiusSmall: "25px",
    borderRadiusMedium: "25px",
    borderRadiusLarge: "25px",
  },
  Select: {
    peers: {
      InternalSelection: {
        textColor: "#FF0000",
      },
    },
  },
};
</script>

<style type="scss">
#app,
body,
html {
  height: 100%;
}

.n-config-provider,
.n-layout {
  height: 100%;
}

.n-layout-header {
  background: #696a5a;
  height: 80px;
  padding: 24px;
}</style>
