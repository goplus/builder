<script setup lang="ts">
import UILoading from '@/components/ui/UILoading.vue';
</script>

<template>
    <div class="chat-loading">
        <UILoading :visible="true"></UILoading>
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

.loading-text{
    margin-top: 6px;
}

</style>
