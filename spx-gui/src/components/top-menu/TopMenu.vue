<!--
 * @Author: Xu Ning
 * @Date: 2024-01-12 16:52:20
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-12 17:10:53
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

<script setup>
import { h, ref } from "vue";
import { NIcon, NMenu, NButton, NInput } from "naive-ui";

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
];
const activeKey = ref(null);

function renderIcon(icon) {
  return () => h(NIcon, null, { default: () => h(icon) });
}
</script>

<style type="scss" scoped>
</style>
