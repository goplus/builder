<template>
    <div>123</div>
</template>

<script setup lang="ts">

defineOptions({ name: 'UIKeyBtn' })
const props = defineProps<{
    value: string
    active?: boolean
    onKeyEvent?: (type: "keydown" | "keyup", key: string, code: string) => void

}>()
withDefaults(props, {
    active: false
})

</script>

<style scoped lang="scss"></style>