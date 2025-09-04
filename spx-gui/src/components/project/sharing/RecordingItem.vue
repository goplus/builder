<template>
    <div>123</div>
</template>

<script setup lang="ts">
import type { RecordingData } from '@apis/RecordingAPIs';

defineOptions({ name: 'RecordingItem' })
export type RecordingItemContext = "public" | "mine";
const props = defineProps<{
    recording: ReplayRecordingData
    context?: RecordingItemContext
}>()
withDefaults(props, {
    context: 'public'
})

</script>

<style scoped lang="scss"></style>