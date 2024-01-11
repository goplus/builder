<template>
    <div class="loading">
        <div>
            <img :src="Logo" />
        </div>
        <p>SPX GUI 正在加载中...</p>
    </div>
</template>
<script setup>
import Logo from "@/assets/logo.png"
</script>
<style>
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