<template>
    <div>123</div>
</template>

<script setup lang="ts">
import type {
    MobileKeyboardZoneToKeyMapping,
} from "@/apis/project";

defineOptions({ name: 'MobileKeyboardEdit' })
const props = defineProps<{
    zoneToKeyMapping: MobileKeyboardZoneToKeyMapping,

}>()
const emit = defineEmits<{
    resolved: [result: MobileKeyboardZoneToKeyMapping]
}>()

</script>

<style scoped lang="scss"></style>