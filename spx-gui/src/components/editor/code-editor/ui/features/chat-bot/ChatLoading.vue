<script setup lang="ts">
</script>

<template>
    <div class="chat-loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">{{ $t({ 'zh': '正在生成，请稍候...', 'en': 'Generating, please wait...'}) }}</p>
    </div>
</template>

<style scoped>
.chat-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.loading-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.loading-text{
    margin-top: 6px;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>
