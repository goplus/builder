<script setup lang="ts">
defineProps<{
    content: string
}>()
</script>

<template>
    <span class="item-container">
        {{ content }}
    </span>
</template>

<style scoped lang="scss">
.item-container {
    cursor: pointer;
    background: var(--ui-color-grey-400);
    padding: 4px 8px;
    border-radius: 8px;
    transition: 0.3s;
    user-select: none;

    &:hover {
        background: var(--ui-color-grey-500);
    }

    &:active {
        background: var(--ui-color-grey-600);
    }
}
</style>