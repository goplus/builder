<!--
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-12 17:27:57
 * @LastEditors: Yao xinyue
 * @LastEditTime: 2024-01-18 17:37:57
 * @FilePath: src/components/sounds/SoundsHome.vue
 * @Description: Sounds Homepage, includes Edit Part And Card List
-->
<template>
  <n-layout has-sider style="height: 700px;">
    <n-layout-sider
        :native-scrollbar="false"
        content-style="paddingLeft: 110px;"
        style="width: 175px"
    >
      <SoundsCard
          v-for="index in 10"
          :key="index"
          :style="{ 'margin-bottom' :'26px' }"
      ></SoundsCard>
    </n-layout-sider>
    <n-layout-content>
      <SoundsEdit style="margin-left: 10px"></SoundsEdit>
    </n-layout-content>
  </n-layout>
</template>

<script setup>
import SoundsCard from "@/components/sounds/SoundsEditCard.vue";
import { NLayout, NLayoutSider, NLayoutContent } from "naive-ui";
import SoundsEdit from "@/components/sounds/SoundsEdit.vue";

</script>

<style scoped>


</style>
