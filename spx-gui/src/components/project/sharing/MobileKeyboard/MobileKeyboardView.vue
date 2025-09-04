<template>
    <div>123</div>
</template>

<script setup lang="ts">
import type {
    MobileKeyboardZoneToKeyMapping
} from "@apis/ProjectAPIs";

defineOptions({ name: 'MobileKeyboardView' })
const props = defineProps<{
    zoneToKeyMapping: MobileKeyboardZoneToKeyMapping
}>()


</script>

<style scoped lang="scss"></style>