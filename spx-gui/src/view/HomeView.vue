<!--
 * @Author: Xu Ning
 * @Date: 2024-01-12 14:59:12
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-12 21:45:34
 * @FilePath: /builder/spx-gui/src/view/HomeView.vue
 * @Description: edit page
-->
<template>
    <div>
        <!--  S Component SpriteList -->
        <SpriteList></SpriteList>
        <NButton>aaa</NButton>
        <!--  E Component SpriteList -->
    </div>

    <FileManagerDemo></FileManagerDemo>
</template>
  
<script setup lang="ts">
import SpriteList from "@/components/sprite-list/SpriteList.vue";
import FileManagerDemo from "@/components/file-manager-demo/FileManagerDemo.vue";
import { NButton } from 'naive-ui';
</script>
  
  
  