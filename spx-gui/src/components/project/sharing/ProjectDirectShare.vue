<script setup lang="ts">
    // import { UIButton, UIFormModal, UITextInput } from '@/components/ui'
    // import { useMessageHandle } from '@/utils/exception'
    // import { getProjectShareRoute } from '@/router'
    import { computed, ref, onUnmounted } from 'vue'
    import type { PlatformConfig } from './platformShare'
    import type { ProjectData } from '@/apis/project'
    import PlatformSelector from './PlatformSelector.vue'
    import Poster from './ProjectPoster.vue'
    import QRCode from 'qrcode'
    // import unsupport from '@/assets/unsupport.svg'

    const props = defineProps<{
    projectData: ProjectData    
    visible: boolean
    }>()

    const emit = defineEmits<{
    cancelled: []
    resolved: []
    }>()
</script>

<template>

</template>

<style scoped lang="scss">
</style>