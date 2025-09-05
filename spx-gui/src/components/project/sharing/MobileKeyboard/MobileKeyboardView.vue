<template>
    <div>123</div>
</template>

<script setup lang="ts">
import type {
    MobileKeyboardZoneToKeyMapping
} from "@/apis/project";

defineOptions({ name: 'MobileKeyboardView' })
defineProps<{
    zoneToKeyMapping: MobileKeyboardZoneToKeyMapping
}>()


</script>

<style scoped lang="scss"></style>