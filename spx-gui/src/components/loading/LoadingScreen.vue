<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 09:16:18
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-18 11:19:56
 * @FilePath: /builder/spx-gui/src/components/loading/Loading.vue
 * @Description: 
-->
<template>
    <div class="loading">
        <div>
            <img :src="Logo" />
        </div>
        <p>SPX GUI is loading...</p>
    </div>
</template>
<script lang="ts" setup>
import Logo from "@/assets/logo.png"
</script>
<style scoped>
.loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

img {
    width: 200px;
}
</style>
