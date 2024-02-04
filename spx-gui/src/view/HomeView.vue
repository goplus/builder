<!--
 * @Author: Xu Ning
 * @Date: 2024-01-12 14:59:12
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-19 17:47:37
 * @FilePath: /builder/spx-gui/src/view/HomeView.vue
 * @Description: edit page
-->
<template>
    <div style="display: flex;height: 100%;">

        <!--  S Component SpriteList -->
        <SpriteList></SpriteList>
        <NButton>aaa</NButton>
        <!--  E Component SpriteList -->
    </div>

    <FileManagerDemo></FileManagerDemo>
</template>
  
<script setup lang="ts">
import SpriteList from "@/components/sprite-list/SpriteList.vue";
// import FileManagerDemo from "@/components/file-manager-demo/FileManagerDemo.vue";
import { NButton } from 'naive-ui';
</script>
  
  
  