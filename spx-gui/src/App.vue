<!--
 * @Author: xuning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-29 17:44:56
 * @FilePath: /builder/spx-gui/src/App.vue
 * @Description:
-->

<template>
  <div id="spx">
    <n-config-provider :theme-overrides="themeOverrides">
      <n-message-provider>
        <n-layout embedded>
          <n-layout-header>
            <TopMenu />
          </n-layout-header>
          <n-layout-content>
            <router-view />
          </n-layout-content>
        </n-layout>
      </n-message-provider>
    </n-config-provider>
  </div>
</template>

<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NLayout,
  NLayoutHeader,
  NLayoutContent,
} from "naive-ui";
import TopMenu from "@/components/top-menu/TopMenu.vue";
import "@/assets/theme";
/**
 * @description: Override spx-gui theme
 * @return {*}
 */
const themeOverrides = {
  common: {
    primaryColor: "#FF81A7",
    fontWeightStrong: "600",
  },
  Button: {
    color: "#FF81A7FF",
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
    border: "1px solid #FF81A7",
  },
  Input: {
    borderHover: "1px solid #FF81A7",
    borderRadius:"25px",
    borderFocus: "1px solid #FF81A7",
  },
  Dropdown: {
    color: "#fff",
    optionTextColor: "rgb(51, 54, 57)",
    dividerColor: "rgb(239, 239, 245)",
    prefixColor: "rgb(51, 54, 57)",
    suffixColor: "rgb(51, 54, 57)",
    optionColorActive: "rgba(24, 160, 88, 0.1)",
    borderRadius: "15px",
    optionTextColorActive: "#18a058",
    optionTextColorChildActive: "#18a058",
    optionColorHoverInverted: "#18a058",
    optionColorActiveInverted: "#18a058",
  },
  Switch: {
    railColorActive: "#FF81A7",
  },
};
</script>

<style lang="scss">
@import "./assets/fonts/font.css";
@import "./assets/theme.scss";

#spx {
  height: 100%;
  background: linear-gradient(180deg, #ffffff15, $background-color);
}

body {
  font-family: ChauPhilomeneOne, AlibabaPuHuiT, Cherry Bomb, Heyhoo, sans-serif;
}

:lang(en) {
  font-size: 15.8px;
}

:lang(zh) {
  font-size: 16px;
}

.n-layout-header {
  background: $base-color;
  height: 60px;
  padding: 13px;
}

.n-layout {
  height: 100%;
  background: #ffffff00;
}

.n-menu,
.n-menu--horizontal,
.n-menu--responsive {
  --n-item-height: 38px !important;
}

.n-menu.n-menu--horizontal .n-menu-item-content {
  padding: 0;
}

.v-overflow {
  width: 100%;
  display: flex;
  overflow: hidden;
  flex-direction: row;
  justify-content: space-around;
}

.n-dialog {
  // Fix the line-height because the global 1.6x line-height causes the icon to be positioned lower.
  .n-dialog__icon {
    line-height: 1;
  }
}
</style>
